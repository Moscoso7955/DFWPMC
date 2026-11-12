import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "@vercel/postgres";
import { publicPhotoUrl } from "./r2";

// "Market Nights": night photo streams.
//
// Contributors upload a night's photos. The directors share one review:
// each photo gets one pass or fail (and maybe a star), whoever sets it.
// The night goes live once the review is marked done, showing only passed
// photos. Photos added to a live night stay hidden until someone passes them.
//
// The shared review lives in the cd_* columns. The md_* columns are from
// when each director reviewed separately; startup folds them into cd_*.

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

import { isNightDate, photoKey, type Mark, type PhotoSize, type Reviewer } from "./photoShared";

export { REVIEWER_LABELS, SHARED_REVIEW, isNightDate, isReviewer, photoKey } from "./photoShared";
export type { Mark, PhotoSize, Reviewer } from "./photoShared";

export const MAX_PHOTOS_PER_NIGHT = 1500;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      create table if not exists photo_contributors (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text not null,
        password_hash text not null,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        last_login_at timestamptz
      )
    `;
    await sql`create unique index if not exists photo_contributors_email_idx on photo_contributors (lower(email))`;
    await sql`
      create table if not exists photo_nights (
        id uuid primary key default gen_random_uuid(),
        night_date date not null,
        title text not null,
        contributor_id uuid references photo_contributors(id) on delete set null,
        cd_done_at timestamptz,
        md_done_at timestamptz,
        published_at timestamptz,
        hidden boolean not null default false,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists photo_items (
        id uuid primary key default gen_random_uuid(),
        night_id uuid not null references photo_nights(id) on delete cascade,
        contributor_id uuid references photo_contributors(id) on delete set null,
        original_name text not null,
        width int not null,
        height int not null,
        full_bytes int,
        uploaded boolean not null default false,
        cd_mark text check (cd_mark in ('pass', 'fail')),
        md_mark text check (md_mark in ('pass', 'fail')),
        cd_star boolean not null default false,
        md_star boolean not null default false,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists photo_items_night_idx on photo_items (night_id)`;
    // One regular night per date, plus any number of photo-event nights
    // (a costume contest moved into Market Nights) on the same date.
    await sql`alter table photo_nights add column if not exists contest_id uuid`;
    await sql`alter table photo_nights add column if not exists slug text`;
    await sql`alter table photo_nights drop constraint if exists photo_nights_night_date_key`;
    await sql`create unique index if not exists photo_nights_date_idx on photo_nights (night_date) where contest_id is null`;
    await sql`create unique index if not exists photo_nights_contest_idx on photo_nights (contest_id) where contest_id is not null`;
    await sql`alter table photo_items add column if not exists caption text`;
    // Upload alerts: photos added after this have not been emailed about yet.
    // Existing nights start "already announced".
    await sql`alter table photo_nights add column if not exists notified_through timestamptz default now()`;
    // Which venue a night shows at; null means the whole market.
    await sql`alter table photo_nights add column if not exists venue text`;
    // Fold the old second review into the shared one: a no from either
    // stays a no, a star from either stays a star, either one done is done.
    await sql`
      update photo_items set
        cd_mark = case when cd_mark = 'fail' or md_mark = 'fail' then 'fail'
                       when cd_mark = 'pass' or md_mark = 'pass' then 'pass' end,
        cd_star = cd_star or md_star, md_mark = null, md_star = false
      where md_mark is not null or md_star
    `;
    await sql`update photo_nights set cd_done_at = coalesce(cd_done_at, md_done_at), md_done_at = null where md_done_at is not null`;
    // A night already finished (under the old two-review rule) goes up.
    await sql`
      update photo_nights n set published_at = now(), hidden = false
      where n.published_at is null and (n.cd_done_at is not null or n.md_done_at is not null)
        and exists (select 1 from photo_items i where i.night_id = n.id and i.uploaded)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Contributors (upload-only logins)
// ---------------------------------------------------------------------------

export type Contributor = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type ContributorSummary = Contributor & { nights: number; photos: number; lastUploadAt: string | null };

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function toContributor(row: Record<string, unknown>): Contributor {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    active: Boolean(row.active),
    createdAt: iso(row.created_at)!,
    lastLoginAt: iso(row.last_login_at),
  };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function checkPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Readable one-time password, e.g. "maple-ember-4821". */
function generatePassword() {
  const words = ["amber", "velvet", "neon", "ember", "maple", "jazz", "rye", "noir", "copper", "violet", "smoke", "brass", "cherry", "honey", "midnight", "silver"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const digits = String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
  return `${pick()}-${pick()}-${digits}`;
}

export async function createContributor(name: string, email: string): Promise<{ contributor: Contributor; password: string }> {
  await ensureSchema();
  const password = generatePassword();
  const hash = await hashPassword(password);
  const { rows } = await sql`
    insert into photo_contributors (name, email, password_hash)
    values (${name.trim()}, ${email.trim().toLowerCase()}, ${hash})
    returning *
  `;
  return { contributor: toContributor(rows[0]), password };
}

export async function resetContributorPassword(id: string): Promise<string | null> {
  await ensureSchema();
  const password = generatePassword();
  const hash = await hashPassword(password);
  const { rowCount } = await sql`update photo_contributors set password_hash = ${hash} where id = ${id}`;
  return rowCount ? password : null;
}

export async function setContributorActive(id: string, active: boolean) {
  await ensureSchema();
  await sql`update photo_contributors set active = ${active} where id = ${id}`;
}

export async function listContributors(): Promise<ContributorSummary[]> {
  await ensureSchema();
  const { rows } = await sql`
    select c.*,
      (select count(distinct night_id) from photo_items i where i.contributor_id = c.id and i.uploaded) as nights,
      (select count(*) from photo_items i where i.contributor_id = c.id and i.uploaded) as photos,
      (select max(created_at) from photo_items i where i.contributor_id = c.id and i.uploaded) as last_upload_at
    from photo_contributors c
    order by c.active desc, lower(c.name)
  `;
  return rows.map((row) => ({
    ...toContributor(row),
    nights: Number(row.nights),
    photos: Number(row.photos),
    lastUploadAt: iso(row.last_upload_at),
  }));
}

export async function getContributor(id: string): Promise<Contributor | null> {
  await ensureSchema();
  const { rows } = await sql`select * from photo_contributors where id = ${id} limit 1`;
  return rows[0] ? toContributor(rows[0]) : null;
}

export async function verifyContributorLogin(email: string, password: string): Promise<Contributor | null> {
  await ensureSchema();
  const { rows } = await sql`
    select * from photo_contributors where lower(email) = ${email.trim().toLowerCase()} and active limit 1
  `;
  const row = rows[0];
  if (!row || !(await checkPassword(password, row.password_hash as string))) return null;
  await sql`update photo_contributors set last_login_at = now() where id = ${row.id as string}`;
  return toContributor(row);
}

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

/** The night for a date, created on first upload. Title is set by the first upload. */
export async function getOrCreateNight(date: string, title: string, contributorId: string) {
  await ensureSchema();
  // A night left with no photos (e.g. a deleted test) starts over fresh:
  // new title and uploader, not reviewed, not live.
  await sql`
    update photo_nights set title = ${title.trim()}, contributor_id = ${contributorId},
      cd_done_at = null, md_done_at = null, published_at = null, hidden = false
    where night_date = ${date} and contest_id is null
      and not exists (select 1 from photo_items i where i.night_id = photo_nights.id)
  `;
  const { rows } = await sql`
    insert into photo_nights (night_date, title, contributor_id)
    values (${date}, ${title.trim()}, ${contributorId})
    on conflict (night_date) where contest_id is null do update set title = photo_nights.title
    returning id, night_date::text as date, title
  `;
  return { id: rows[0].id as string, date: rows[0].date as string, title: rows[0].title as string };
}

export async function addPendingPhoto(input: {
  nightId: string;
  contributorId: string;
  originalName: string;
  width: number;
  height: number;
}): Promise<{ id: string; date: string } | null> {
  await ensureSchema();
  const { rows: nightRows } = await sql`
    select n.night_date::text as date,
      (select count(*) from photo_items i where i.night_id = n.id) as total
    from photo_nights n where n.id = ${input.nightId} limit 1
  `;
  const night = nightRows[0];
  if (!night || Number(night.total) >= MAX_PHOTOS_PER_NIGHT) return null;
  const { rows } = await sql`
    insert into photo_items (night_id, contributor_id, original_name, width, height)
    values (${input.nightId}, ${input.contributorId}, ${input.originalName.slice(0, 200)}, ${input.width}, ${input.height})
    returning id
  `;
  return { id: rows[0].id as string, date: night.date as string };
}

/** The photo, if it belongs to this contributor and hasn't been confirmed yet. */
export async function getPendingPhoto(photoId: string, contributorId: string) {
  await ensureSchema();
  const { rows } = await sql`
    select i.id, i.night_id, n.night_date::text as date, n.published_at
    from photo_items i join photo_nights n on n.id = i.night_id
    where i.id = ${photoId} and i.contributor_id = ${contributorId} and not i.uploaded
    limit 1
  `;
  return rows[0] ? { id: rows[0].id as string, nightId: rows[0].night_id as string, date: rows[0].date as string, published: Boolean(rows[0].published_at) } : null;
}

export async function confirmPhotoUploaded(photoId: string, nightId: string, fullBytes: number, nightPublished: boolean) {
  await ensureSchema();
  await sql`update photo_items set uploaded = true, full_bytes = ${fullBytes} where id = ${photoId}`;
  // A reviewer who already finished a not-yet-live night has new photos to
  // look at, so their "done" no longer holds.
  if (!nightPublished) {
    await sql`update photo_nights set cd_done_at = null, md_done_at = null where id = ${nightId}`;
  }
}

export type ContributorNight = { date: string; title: string; photos: number; live: boolean; shown: number };

export async function listContributorNights(contributorId: string): Promise<ContributorNight[]> {
  await ensureSchema();
  const { rows } = await sql`
    select n.night_date::text as date, n.title,
      count(i.id) as photos,
      (n.published_at is not null and not n.hidden) as live,
      count(i.id) filter (where (i.cd_mark = 'pass' or i.md_mark = 'pass') and coalesce(i.cd_mark, '') <> 'fail' and coalesce(i.md_mark, '') <> 'fail') as shown
    from photo_items i join photo_nights n on n.id = i.night_id
    where i.contributor_id = ${contributorId} and i.uploaded
    group by n.id
    order by n.night_date desc
  `;
  return rows.map((r) => ({ date: r.date as string, title: r.title as string, photos: Number(r.photos), live: Boolean(r.live), shown: Number(r.shown) }));
}

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------

export type AdminNight = {
  id: string;
  date: string;
  /** URL segment under /photos: the date, or date + slug for a photo event. */
  path: string;
  contest: boolean;
  title: string;
  contributor: string | null;
  /** The venue the night shows at, or null for the whole market. */
  venue: string | null;
  photos: number;
  reviewed: Record<Reviewer, number>;
  done: Record<Reviewer, boolean>;
  published: boolean;
  hidden: boolean;
  liveCount: number;
  needsReview: boolean;
};

export async function listNightsForAdmin(options: { includeEmpty?: boolean } = {}): Promise<AdminNight[]> {
  await ensureSchema();
  const { rows } = await sql`
    select n.id, n.night_date::text as date, n.title, n.cd_done_at, n.md_done_at, n.published_at, n.hidden,
      n.contest_id, n.slug, n.venue, c.name as contributor,
      count(i.id) as photos,
      count(i.id) filter (where i.cd_mark is not null) as cd_reviewed,
      count(i.id) filter (where i.md_mark is not null) as md_reviewed,
      count(i.id) filter (where (i.cd_mark = 'pass' or i.md_mark = 'pass') and coalesce(i.cd_mark, '') <> 'fail' and coalesce(i.md_mark, '') <> 'fail') as live_count,
      count(i.id) filter (where i.cd_mark is null and i.md_mark is null) as unreviewed
    from photo_nights n
    left join photo_contributors c on c.id = n.contributor_id
    left join photo_items i on i.night_id = n.id and i.uploaded
    group by n.id, c.name
    order by n.night_date desc, n.contest_id nulls first
  `;
  return rows
    .map((r) => {
      const photos = Number(r.photos);
      const cd = Number(r.cd_reviewed);
      const md = Number(r.md_reviewed);
      const published = Boolean(r.published_at);
      return {
        id: r.id as string,
        date: r.date as string,
        path: nightPath(r.date as string, r.contest_id as string | null, r.slug as string | null),
        contest: Boolean(r.contest_id),
        title: r.title as string,
        contributor: (r.contributor as string | null) ?? null,
        venue: (r.venue as string | null) ?? null,
        photos,
        reviewed: { cd, md },
        done: { cd: Boolean(r.cd_done_at), md: Boolean(r.md_done_at) },
        published,
        hidden: Boolean(r.hidden),
        liveCount: Number(r.live_count),
        needsReview: !published || Number(r.unreviewed) > 0,
      };
    })
    .filter((n) => options.includeEmpty || n.photos > 0);
}

export type ReviewPhoto = {
  id: string;
  code: string;
  name: string;
  width: number;
  height: number;
  thumb: string;
  view: string;
  marks: Record<Reviewer, Mark | null>;
  stars: Record<Reviewer, boolean>;
};

export type ReviewNight = Omit<AdminNight, "needsReview"> & { photosList: ReviewPhoto[] };

export async function getNightForReview(nightId: string): Promise<ReviewNight | null> {
  const all = await listNightsForAdmin({ includeEmpty: true });
  const night = all.find((n) => n.id === nightId);
  if (!night) return null;
  const { rows } = await sql`
    select id, original_name, caption, width, height, cd_mark, md_mark, cd_star, md_star
    from photo_items where night_id = ${nightId} and uploaded
    order by original_name, created_at
  `;
  const { needsReview: _unused, ...rest } = night;
  void _unused;
  return {
    ...rest,
    photosList: rows.map((r) => ({
      id: r.id as string,
      code: photoCode(r.id as string),
      name: ((r.caption as string | null) || r.original_name) as string,
      width: Number(r.width),
      height: Number(r.height),
      thumb: publicPhotoUrl(photoKey(night.date, r.id as string, "thumb")),
      view: publicPhotoUrl(photoKey(night.date, r.id as string, "view")),
      marks: { cd: (r.cd_mark as Mark | null) ?? null, md: (r.md_mark as Mark | null) ?? null },
      stars: { cd: Boolean(r.cd_star), md: Boolean(r.md_star) },
    })),
  };
}

export async function setPhotoMark(photoId: string, reviewer: Reviewer, mark: Mark | null) {
  await ensureSchema();
  if (reviewer === "cd") await sql`update photo_items set cd_mark = ${mark} where id = ${photoId}`;
  else await sql`update photo_items set md_mark = ${mark} where id = ${photoId}`;
}

export async function setPhotoStar(photoId: string, reviewer: Reviewer, starred: boolean) {
  await ensureSchema();
  if (reviewer === "cd") await sql`update photo_items set cd_star = ${starred} where id = ${photoId}`;
  else await sql`update photo_items set md_star = ${starred} where id = ${photoId}`;
}

export type DoneResult = { ok: true; published: boolean } | { ok: false; error: string };

/**
 * Mark (or unmark) a reviewer's review as finished. Finishing needs every
 * photo marked. The first finished review puts the night live.
 */
export async function setReviewerDone(nightId: string, reviewer: Reviewer, done: boolean): Promise<DoneResult> {
  await ensureSchema();
  if (done) {
    const { rows } =
      reviewer === "cd"
        ? await sql`
            select count(*) filter (where cd_mark is null) as left_count, count(*) as total
            from photo_items where night_id = ${nightId} and uploaded
          `
        : await sql`
            select count(*) filter (where md_mark is null) as left_count, count(*) as total
            from photo_items where night_id = ${nightId} and uploaded
          `;
    if (Number(rows[0]?.total ?? 0) === 0) return { ok: false, error: "This night has no photos yet." };
    if (Number(rows[0].left_count) > 0) return { ok: false, error: `${rows[0].left_count} photos still need a pass or fail.` };
  }
  if (reviewer === "cd") await sql`update photo_nights set cd_done_at = ${done ? new Date().toISOString() : null} where id = ${nightId}`;
  else await sql`update photo_nights set md_done_at = ${done ? new Date().toISOString() : null} where id = ${nightId}`;

  const { rows } = await sql`
    update photo_nights set published_at = now(), hidden = false
    where id = ${nightId} and published_at is null and (cd_done_at is not null or md_done_at is not null)
    returning id
  `;
  return { ok: true, published: rows.length > 0 };
}

/**
 * Takes a live night off the site and back into review. Passes, fails and
 * stars are kept; it goes live again once either reviewer marks done again.
 */
export async function reopenNightReview(nightId: string) {
  await ensureSchema();
  await sql`
    update photo_nights set published_at = null, hidden = false, cd_done_at = null, md_done_at = null
    where id = ${nightId}
  `;
}

/** Which venue the night shows at; null puts it back to the whole market. */
export async function setNightVenue(nightId: string, venue: string | null) {
  await ensureSchema();
  await sql`update photo_nights set venue = ${venue} where id = ${nightId}`;
}

export async function setNightHidden(nightId: string, hidden: boolean) {
  await ensureSchema();
  await sql`update photo_nights set hidden = ${hidden} where id = ${nightId} and published_at is not null`;
}

/**
 * Deletes every photo either director failed (they can never be shown) and
 * returns the storage keys to remove.
 */
export async function deleteFailedPhotos(nightId: string): Promise<{ keys: string[]; nightDeleted: boolean }> {
  await ensureSchema();
  const { rows } = await sql`
    delete from photo_items i using photo_nights n
    where i.night_id = n.id and n.id = ${nightId} and (i.cd_mark = 'fail' or i.md_mark = 'fail')
    returning i.id, n.night_date::text as date
  `;
  const keys = rows.flatMap((r) => (["full", "view", "thumb"] as PhotoSize[]).map((size) => photoKey(r.date as string, r.id as string, size)));
  // A night with nothing left in it has no reason to exist.
  const { rows: left } = await sql`select count(*) as n from photo_items where night_id = ${nightId}`;
  let nightDeleted = false;
  if (Number(left[0]?.n ?? 0) === 0) {
    await sql`delete from photo_nights where id = ${nightId}`;
    nightDeleted = true;
  }
  return { keys, nightDeleted };
}

/** Deletes the night and returns the storage keys to remove. */
export async function deleteNight(nightId: string): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`
    select i.id, n.night_date::text as date from photo_items i join photo_nights n on n.id = i.night_id
    where n.id = ${nightId}
  `;
  await sql`delete from photo_nights where id = ${nightId}`;
  return rows.flatMap((r) => (["full", "view", "thumb"] as PhotoSize[]).map((size) => photoKey(r.date as string, r.id as string, size)));
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export type LiveNight = { date: string; path: string; title: string; count: number; previews: string[]; venue: string | null };

export type LivePhoto = {
  id: string;
  code: string;
  caption: string | null;
  width: number;
  height: number;
  thumb: string;
  view: string;
  full: string;
};

/** "2026-10-31" for a regular night, "2026-10-31-costume-contest" for a photo event. */
export function nightPath(date: string, contestId: string | null, slug: string | null) {
  return contestId ? `${date}-${slug || contestId.slice(0, 8)}` : date;
}

/** Short code people quote when asking for a photo to come down, e.g. "A1B2C3D4". */
export function photoCode(photoId: string) {
  return photoId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export async function listLiveNights(venue: string | null = null): Promise<LiveNight[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    await ensureSchema();
    const { rows } = await sql`
      select n.night_date::text as date, n.title, n.contest_id, n.slug, n.venue,
        count(i.id) as count,
        (array_agg(i.id order by (i.cd_star or i.md_star) desc, (i.cd_star and i.md_star) desc, i.original_name))[1:3] as preview_ids
      from photo_nights n
      join photo_items i on i.night_id = n.id and i.uploaded and (i.cd_mark = 'pass' or i.md_mark = 'pass') and coalesce(i.cd_mark, '') <> 'fail' and coalesce(i.md_mark, '') <> 'fail'
      where n.published_at is not null and not n.hidden
        and (${venue}::text is null or n.venue = ${venue})
      group by n.id
      order by n.night_date desc, n.contest_id nulls first
    `;
    return rows.map((r) => ({
      date: r.date as string,
      path: nightPath(r.date as string, r.contest_id as string | null, r.slug as string | null),
      title: r.title as string,
      count: Number(r.count),
      previews: ((r.preview_ids as string[]) ?? []).map((id) => publicPhotoUrl(photoKey(r.date as string, id, "thumb"))),
      venue: (r.venue as string | null) ?? null,
    }));
  } catch (error) {
    // The photo section is extra; never take the Visit page or calendar down with it.
    console.error("listLiveNights failed", error);
    return [];
  }
}

export async function getLiveNight(
  path: string,
): Promise<{ date: string; path: string; title: string; by: string | null; photos: LivePhoto[] } | null> {
  if (!process.env.POSTGRES_URL) return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:-([a-z0-9-]{1,80}))?$/.exec(path);
  if (!match || !isNightDate(match[1])) return null;
  const [, date, slug] = match;
  await ensureSchema();
  const { rows: nightRows } = slug
    ? await sql`
        select n.id, n.title, c.name as by from photo_nights n
        left join photo_contributors c on c.id = n.contributor_id
        where n.night_date = ${date} and n.contest_id is not null and n.slug = ${slug}
          and n.published_at is not null and not n.hidden limit 1
      `
    : await sql`
        select n.id, n.title, c.name as by from photo_nights n
        left join photo_contributors c on c.id = n.contributor_id
        where n.night_date = ${date} and n.contest_id is null
          and n.published_at is not null and not n.hidden limit 1
      `;
  const night = nightRows[0];
  if (!night) return null;
  const { rows } = await sql`
    select id, caption, width, height from photo_items
    where night_id = ${night.id as string} and uploaded and (cd_mark = 'pass' or md_mark = 'pass') and coalesce(cd_mark, '') <> 'fail' and coalesce(md_mark, '') <> 'fail'
    order by original_name, created_at
  `;
  if (rows.length === 0) return null;
  return {
    date,
    path,
    title: night.title as string,
    by: (night.by as string | null) ?? null,
    photos: rows.map((r) => ({
      id: r.id as string,
      code: photoCode(r.id as string),
      caption: (r.caption as string | null) ?? null,
      width: Number(r.width),
      height: Number(r.height),
      thumb: publicPhotoUrl(photoKey(date, r.id as string, "thumb")),
      view: publicPhotoUrl(photoKey(date, r.id as string, "view")),
      full: publicPhotoUrl(photoKey(date, r.id as string, "full")),
    })),
  };
}

// ---------------------------------------------------------------------------
// Photo events (contests) moved into Market Nights
// ---------------------------------------------------------------------------

export type ContestNightItem = { id: string; width: number; height: number; sortKey: string; caption: string };

/**
 * Creates (or tops up) the Market Nights night for a photo event. The
 * photos are already in storage under the event's date, so this only adds
 * rows. It goes through the usual two-director review before it's live.
 */
export async function upsertContestNight(input: {
  contestId: string;
  date: string;
  title: string;
  slug: string;
  items: ContestNightItem[];
}): Promise<string> {
  await ensureSchema();
  // Two events with the same name on one date still get their own links.
  const { rows: taken } = await sql`
    select 1 from photo_nights
    where night_date = ${input.date} and slug = ${input.slug} and contest_id is distinct from ${input.contestId}::uuid
    limit 1
  `;
  const slug = taken[0] ? `${input.slug}-${input.contestId.slice(0, 4)}` : input.slug;
  const { rows } = await sql`
    insert into photo_nights (night_date, title, contest_id, slug)
    values (${input.date}, ${input.title.trim()}, ${input.contestId}, ${slug})
    on conflict (contest_id) where contest_id is not null do update set title = excluded.title, slug = photo_nights.slug
    returning id
  `;
  const nightId = rows[0].id as string;
  for (const item of input.items) {
    await sql`
      insert into photo_items (id, night_id, original_name, caption, width, height, uploaded)
      values (${item.id}, ${nightId}, ${item.sortKey}, ${item.caption}, ${item.width}, ${item.height}, true)
      on conflict (id) do update set original_name = excluded.original_name, caption = excluded.caption
    `;
  }
  return nightId;
}

/** Ids of photos already in Market Nights (their files must be kept). */
export async function photoIdsInNights(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  await ensureSchema();
  const { rows } = await sql.query(`select id::text as id from photo_items where id = any($1::uuid[])`, [ids]);
  return new Set(rows.map((r) => r.id as string));
}

// ---------------------------------------------------------------------------
// Upload alerts (see photoAlerts.ts)
// ---------------------------------------------------------------------------

export type UploadToAnnounce = {
  nightId: string;
  date: string;
  title: string;
  contributor: string | null;
  contest: boolean;
  published: boolean;
  /** Photos added since the last alert. */
  newCount: number;
  total: number;
  /** Newest photo in this batch; the alert covers through here. */
  through: string;
  previews: string[];
};

function toUpload(r: Record<string, unknown>): UploadToAnnounce {
  return {
    nightId: r.id as string,
    date: r.date as string,
    title: r.title as string,
    contributor: (r.contributor as string | null) ?? null,
    contest: Boolean(r.contest_id),
    published: Boolean(r.published_at),
    newCount: Number(r.new_count),
    total: Number(r.total),
    through: new Date(r.through as string).toISOString(),
    previews: ((r.preview_ids as string[] | null) ?? []).map((id) => publicPhotoUrl(photoKey(r.date as string, id, "thumb"))),
  };
}

/**
 * Nights with photos nobody's been emailed about, once uploading has gone
 * quiet for `quietMinutes` (so a 300-photo night is one email, not 300).
 */
export async function listUploadsToAnnounce(quietMinutes = Number(process.env.PHOTO_ALERT_QUIET_MINUTES ?? 10)): Promise<UploadToAnnounce[]> {
  await ensureSchema();
  const { rows } = await sql`
    select n.id, n.night_date::text as date, n.title, n.contest_id, n.published_at, c.name as contributor,
      count(i.id) filter (where i.created_at > coalesce(n.notified_through, '-infinity')) as new_count,
      count(i.id) as total,
      max(i.created_at) as through,
      (array_agg(i.id::text order by i.original_name, i.created_at) filter (where i.created_at > coalesce(n.notified_through, '-infinity')))[1:6] as preview_ids
    from photo_nights n
    join photo_items i on i.night_id = n.id and i.uploaded
    left join photo_contributors c on c.id = n.contributor_id
    where (select max(created_at) from photo_items p where p.night_id = n.id) < now() - make_interval(mins => ${quietMinutes})
    group by n.id, c.name
    having count(i.id) filter (where i.created_at > coalesce(n.notified_through, '-infinity')) > 0
    order by max(i.created_at)
  `;
  return rows.map(toUpload);
}

/** Claims a batch so overlapping runs send it once. False if already claimed. */
export async function claimUploadAlert(nightId: string, through: string): Promise<{ ok: boolean; previous: string | null }> {
  await ensureSchema();
  const { rows: before } = await sql`select notified_through from photo_nights where id = ${nightId}`;
  const previous = before[0]?.notified_through ? new Date(before[0].notified_through as string).toISOString() : null;
  const { rows } = await sql`
    update photo_nights set notified_through = ${through}
    where id = ${nightId} and (notified_through is null or notified_through < ${through})
    returning id
  `;
  return { ok: rows.length > 0, previous };
}

/** Puts a claim back after a failed send. */
export async function releaseUploadAlert(nightId: string, previous: string | null) {
  await ensureSchema();
  await sql`update photo_nights set notified_through = ${previous} where id = ${nightId}`;
}

/** The night's whole set, as a first alert would show it (for the admin preview). */
export async function getUploadForPreview(nightId?: string): Promise<UploadToAnnounce | null> {
  await ensureSchema();
  const { rows } = await sql.query(
    `select n.id, n.night_date::text as date, n.title, n.contest_id, n.published_at, c.name as contributor,
      count(i.id) as new_count, count(i.id) as total, max(i.created_at) as through,
      (array_agg(i.id::text order by i.original_name, i.created_at))[1:6] as preview_ids
    from photo_nights n
    join photo_items i on i.night_id = n.id and i.uploaded
    left join photo_contributors c on c.id = n.contributor_id
    ${nightId ? "where n.id = $1" : ""}
    group by n.id, c.name
    order by max(i.created_at) desc
    limit 1`,
    nightId ? [nightId] : [],
  );
  return rows[0] ? toUpload(rows[0]) : null;
}

/**
 * The upload account for someone signed in with Google who can upload:
 * found by email, made on first upload (no password; Google is the login).
 */
export async function contributorForEmail(email: string, name: string): Promise<Contributor> {
  await ensureSchema();
  const lower = email.trim().toLowerCase();
  const { rows } = await sql`select * from photo_contributors where lower(email) = ${lower} limit 1`;
  if (rows[0]) {
    if (!rows[0].active) await sql`update photo_contributors set active = true where id = ${rows[0].id as string}`;
    return toContributor({ ...rows[0], active: true });
  }
  const { contributor } = await createContributor(name || lower, lower);
  return contributor;
}
