import { sql } from "@vercel/postgres";
import { publicPhotoUrl } from "./r2";
import { photoKey, type PhotoSize } from "./photoShared";
import { photoIdsInNights, upsertContestNight } from "./photoStore";
import {
  calendarLabel,
  phaseOf,
  slugify,
  normalizeCategories,
  type CalendarContest,
  type ContestCategory,
  type ContestPhase,
  type ContestTimes,
  type EntryStatus,
  type ModerationMode,
} from "./contestShared";

// Photo events: a costume contest (or any "upload a photo, everyone votes"
// night). Guests enter from their phone inside the upload window and vote
// inside the voting window. Each event has one or more prizes ("Scariest",
// "Most original"); every phone gets one entry and one vote per prize,
// votes are final, and counts stay hidden until voting closes. Photos are stored
// under the event's date like any night, so afterwards the whole event
// can move into Market Nights without copying files.

export const MAX_ENTRIES = 400;
const ENTRIES_PER_IP_10_MIN = 15;
const VOTES_PER_IP_MINUTE = 20;
/** Votes for one entry from one connection in 5 minutes that staff should look at. */
export const BURST_VOTES = 10;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      create table if not exists photo_contests (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        contest_date date not null,
        upload_opens_at timestamptz not null,
        upload_closes_at timestamptz not null,
        vote_opens_at timestamptz not null,
        vote_closes_at timestamptz not null,
        moderation text not null default 'auto' check (moderation in ('auto', 'manual')),
        hide_after_reports int not null default 3,
        night_id uuid,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists photo_contest_entries (
        id uuid primary key default gen_random_uuid(),
        contest_id uuid not null references photo_contests(id) on delete cascade,
        number int not null,
        name text not null,
        costume text not null default '',
        device_id text not null,
        ip text,
        width int not null,
        height int not null,
        status text not null default 'uploading' check (status in ('uploading', 'live', 'held', 'removed')),
        hold_reason text,
        staff_approved boolean not null default false,
        report_count int not null default 0,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create unique index if not exists photo_contest_entries_device_idx on photo_contest_entries (contest_id, device_id)`;
    await sql`
      create table if not exists photo_contest_votes (
        contest_id uuid not null references photo_contests(id) on delete cascade,
        device_id text not null,
        entry_id uuid not null references photo_contest_entries(id) on delete cascade,
        ip text,
        voided boolean not null default false,
        created_at timestamptz not null default now(),
        primary key (contest_id, device_id)
      )
    `;
    await sql`create index if not exists photo_contest_votes_entry_idx on photo_contest_votes (entry_id)`;
    // Prizes: one vote per phone per prize.
    await sql`alter table photo_contests add column if not exists categories jsonb`;
    await sql`alter table photo_contests add column if not exists one_prize_each boolean not null default true`;
    await sql`alter table photo_contest_votes add column if not exists category text not null default 'main'`;
    await sql`alter table photo_contest_votes drop constraint if exists photo_contest_votes_pkey`;
    await sql`create unique index if not exists photo_contest_votes_device_idx on photo_contest_votes (contest_id, device_id, category)`;
    await sql`
      create table if not exists photo_contest_reports (
        entry_id uuid not null references photo_contest_entries(id) on delete cascade,
        device_id text not null,
        created_at timestamptz not null default now(),
        primary key (entry_id, device_id)
      )
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Contests
// ---------------------------------------------------------------------------

export type Contest = ContestTimes & {
  id: string;
  title: string;
  date: string;
  slug: string;
  moderation: ModerationMode;
  hideAfterReports: number;
  nightId: string | null;
  categories: ContestCategory[];
  /** A costume can win at most one prize. */
  onePrizeEach: boolean;
  uploads: ContestPhase;
  voting: ContestPhase;
};

export type ContestInput = ContestTimes & {
  title: string;
  date: string;
  moderation: ModerationMode;
  hideAfterReports: number;
  categories: ContestCategory[];
  onePrizeEach: boolean;
};

const iso = (v: unknown) => new Date(v as string).toISOString();

function toContest(r: Record<string, unknown>): Contest {
  const times = {
    uploadOpensAt: iso(r.upload_opens_at),
    uploadClosesAt: iso(r.upload_closes_at),
    voteOpensAt: iso(r.vote_opens_at),
    voteClosesAt: iso(r.vote_closes_at),
  };
  return {
    id: r.id as string,
    title: r.title as string,
    date: r.date as string,
    slug: slugify(r.title as string),
    moderation: r.moderation as ModerationMode,
    hideAfterReports: Number(r.hide_after_reports),
    nightId: (r.night_id as string | null) ?? null,
    categories: normalizeCategories(typeof r.categories === "string" ? JSON.parse(r.categories) : r.categories),
    onePrizeEach: r.one_prize_each !== false,
    ...times,
    uploads: phaseOf(times.uploadOpensAt, times.uploadClosesAt),
    voting: phaseOf(times.voteOpensAt, times.voteClosesAt),
  };
}

const CONTEST_COLUMNS = `id, title, contest_date::text as date, upload_opens_at, upload_closes_at, vote_opens_at, vote_closes_at, moderation, hide_after_reports, night_id, categories, one_prize_each`;

export async function createContest(input: ContestInput): Promise<Contest> {
  await ensureSchema();
  const { rows } = await sql`
    insert into photo_contests (title, contest_date, upload_opens_at, upload_closes_at, vote_opens_at, vote_closes_at, moderation, hide_after_reports, categories, one_prize_each)
    values (${input.title.trim()}, ${input.date}, ${input.uploadOpensAt}, ${input.uploadClosesAt}, ${input.voteOpensAt}, ${input.voteClosesAt}, ${input.moderation}, ${input.hideAfterReports},
      ${JSON.stringify(input.categories)}::jsonb, ${input.onePrizeEach})
    returning id
  `;
  return (await getContest(rows[0].id as string))!;
}

export type UpdateResult = { ok: true } | { ok: false; error: string };

export async function updateContest(id: string, input: ContestInput): Promise<UpdateResult> {
  await ensureSchema();
  const current = await getContest(id);
  if (!current) return { ok: false, error: "That photo event no longer exists." };
  if (current.date !== input.date) {
    // Photos are stored under the event's date.
    const { rows } = await sql`select count(*) as n from photo_contest_entries where contest_id = ${id}`;
    if (Number(rows[0]?.n ?? 0) > 0) return { ok: false, error: "The date can't change once people have entered." };
  }
  await sql`
    update photo_contests set title = ${input.title.trim()}, contest_date = ${input.date},
      upload_opens_at = ${input.uploadOpensAt}, upload_closes_at = ${input.uploadClosesAt},
      vote_opens_at = ${input.voteOpensAt}, vote_closes_at = ${input.voteClosesAt},
      moderation = ${input.moderation}, hide_after_reports = ${input.hideAfterReports},
      categories = ${JSON.stringify(input.categories)}::jsonb, one_prize_each = ${input.onePrizeEach}
    where id = ${id}
  `;
  return { ok: true };
}

export async function getContest(id: string): Promise<Contest | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await ensureSchema();
  const { rows } = await sql.query(`select ${CONTEST_COLUMNS} from photo_contests where id = $1 limit 1`, [id]);
  return rows[0] ? toContest(rows[0]) : null;
}

/** Ends uploads and voting right now. */
export async function closeContestNow(id: string) {
  await ensureSchema();
  await sql`
    update photo_contests set
      upload_closes_at = least(upload_closes_at, now()),
      upload_opens_at = least(upload_opens_at, now()),
      vote_closes_at = least(vote_closes_at, now()),
      vote_opens_at = least(vote_opens_at, now())
    where id = ${id}
  `;
}

/** Deletes the event and returns the storage keys no Market Nights night still uses. */
export async function deleteContest(id: string): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`
    select e.id, c.contest_date::text as date from photo_contest_entries e
    join photo_contests c on c.id = e.contest_id where c.id = ${id}
  `;
  const kept = await photoIdsInNights(rows.map((r) => r.id as string));
  await sql`delete from photo_contests where id = ${id}`;
  return rows.filter((r) => !kept.has(r.id as string)).flatMap((r) => entryKeys(r.date as string, r.id as string));
}

export type ContestSummary = Contest & { entries: number; live: number; held: number; votes: number };

export async function listContests(): Promise<ContestSummary[]> {
  await ensureSchema();
  const { rows } = await sql.query(`
    select ${CONTEST_COLUMNS},
      (select count(*) from photo_contest_entries e where e.contest_id = photo_contests.id and e.status in ('live', 'held')) as entries,
      (select count(*) from photo_contest_entries e where e.contest_id = photo_contests.id and e.status = 'live') as live,
      (select count(*) from photo_contest_entries e where e.contest_id = photo_contests.id and e.status = 'held') as held,
      (select count(*) from photo_contest_votes v where v.contest_id = photo_contests.id and not v.voided) as votes
    from photo_contests
    order by contest_date desc, upload_opens_at desc
  `);
  return rows.map((r) => ({
    ...toContest(r),
    entries: Number(r.entries),
    live: Number(r.live),
    held: Number(r.held),
    votes: Number(r.votes),
  }));
}

/**
 * The event fwpublicmarket.com/contest shows: one that's running, else the next
 * one (up to two weeks out), else the one that just ended (for two days,
 * so people can see who won).
 */
export async function getCurrentContest(): Promise<Contest | null> {
  if (!process.env.POSTGRES_URL) return null;
  await ensureSchema();
  const { rows } = await sql.query(`
    select ${CONTEST_COLUMNS} from photo_contests
    where vote_closes_at > now() - interval '2 days'
      and least(upload_opens_at, vote_opens_at) < now() + interval '14 days'
    order by
      (least(upload_opens_at, vote_opens_at) <= now() and greatest(upload_closes_at, vote_closes_at) > now()) desc,
      (greatest(upload_closes_at, vote_closes_at) > now()) desc,
      case when greatest(upload_closes_at, vote_closes_at) > now() then upload_opens_at end asc,
      vote_closes_at desc
    limit 1
  `);
  return rows[0] ? toContest(rows[0]) : null;
}

/** Events for the calendar's day cells and day popup. */
export async function listCalendarContests(): Promise<CalendarContest[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    await ensureSchema();
    const { rows } = await sql.query(`
      select ${CONTEST_COLUMNS} from photo_contests
      where contest_date >= (now() - interval '3 days')::date
      order by upload_opens_at
    `);
    return rows.map((r) => {
      const contest = toContest(r);
      return { id: contest.id, date: contest.date, title: contest.title, label: calendarLabel(contest) };
    });
  } catch (error) {
    console.error("listCalendarContests failed", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export function entryKeys(date: string, entryId: string) {
  return (["full", "view", "thumb"] as PhotoSize[]).map((size) => photoKey(date, entryId, size));
}

export type StartEntryResult =
  | { ok: true; entry: { id: string; number: number; date: string } }
  | { ok: false; error: string; status: number };

export async function startEntry(input: {
  contestId: string;
  deviceId: string;
  ip: string | null;
  name: string;
  costume: string;
  width: number;
  height: number;
}): Promise<StartEntryResult> {
  await ensureSchema();
  const contest = await getContest(input.contestId);
  if (!contest) return { ok: false, error: "This contest isn't running.", status: 404 };
  if (contest.uploads === "before") return { ok: false, error: "Entries aren't open yet.", status: 409 };
  if (contest.uploads === "after") return { ok: false, error: "Entries are closed.", status: 409 };

  const { rows: mine } = await sql`
    select id, status from photo_contest_entries where contest_id = ${contest.id} and device_id = ${input.deviceId} limit 1
  `;
  if (mine[0] && mine[0].status !== "uploading") {
    return { ok: false, error: "This phone has already entered. One entry per phone.", status: 409 };
  }
  // An entry whose upload never finished starts over.
  if (mine[0]) await sql`delete from photo_contest_entries where id = ${mine[0].id as string}`;

  const { rows: counts } = await sql`
    select count(*) as total,
      count(*) filter (where ip = ${input.ip} and created_at > now() - interval '10 minutes') as recent_from_ip
    from photo_contest_entries where contest_id = ${contest.id}
  `;
  if (Number(counts[0]?.total ?? 0) >= MAX_ENTRIES) return { ok: false, error: "The contest is full.", status: 409 };
  if (input.ip && Number(counts[0]?.recent_from_ip ?? 0) >= ENTRIES_PER_IP_10_MIN) {
    return { ok: false, error: "Lots of entries from this connection. Try again in a few minutes.", status: 429 };
  }

  try {
    const { rows } = await sql`
      insert into photo_contest_entries (contest_id, number, name, costume, device_id, ip, width, height)
      values (
        ${contest.id},
        (select coalesce(max(number), 0) + 1 from photo_contest_entries where contest_id = ${contest.id}),
        ${input.name}, ${input.costume}, ${input.deviceId}, ${input.ip}, ${input.width}, ${input.height}
      )
      returning id, number
    `;
    return { ok: true, entry: { id: rows[0].id as string, number: Number(rows[0].number), date: contest.date } };
  } catch {
    return { ok: false, error: "This phone has already entered. One entry per phone.", status: 409 };
  }
}

export async function getUploadingEntry(entryId: string, deviceId: string) {
  await ensureSchema();
  const { rows } = await sql`
    select e.id, e.number, e.name, e.costume, e.contest_id, c.contest_date::text as date, c.moderation, c.upload_closes_at
    from photo_contest_entries e join photo_contests c on c.id = e.contest_id
    where e.id = ${entryId} and e.device_id = ${deviceId} and e.status = 'uploading'
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    number: Number(r.number),
    name: r.name as string,
    costume: r.costume as string,
    contestId: r.contest_id as string,
    date: r.date as string,
    moderation: r.moderation as ModerationMode,
    // A few minutes' grace: the photo was picked before the window closed.
    expired: Date.now() > Date.parse(iso(r.upload_closes_at)) + 10 * 60 * 1000,
  };
}

export async function finishEntry(entryId: string, status: "live" | "held", reason: string | null) {
  await ensureSchema();
  await sql`update photo_contest_entries set status = ${status}, hold_reason = ${reason} where id = ${entryId}`;
}

export type MyEntry = { id: string; number: number; name: string; costume: string; status: EntryStatus; thumb: string };

export async function getMyEntry(contestId: string, deviceId: string): Promise<MyEntry | null> {
  await ensureSchema();
  const { rows } = await sql`
    select e.id, e.number, e.name, e.costume, e.status, c.contest_date::text as date
    from photo_contest_entries e join photo_contests c on c.id = e.contest_id
    where e.contest_id = ${contestId} and e.device_id = ${deviceId} and e.status <> 'uploading'
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    number: Number(r.number),
    name: r.name as string,
    costume: r.costume as string,
    status: r.status as EntryStatus,
    thumb: publicPhotoUrl(photoKey(r.date as string, r.id as string, "thumb")),
  };
}

export type VoteEntry = {
  id: string;
  number: number;
  name: string;
  costume: string;
  width: number;
  height: number;
  thumb: string;
  view: string;
  /** Votes per prize id; only once voting has closed. */
  votes: Record<string, number> | null;
  total: number | null;
  /** Names of the prizes it won; only once voting has closed. */
  wins: string[];
};

export type CategoryWinner = {
  category: ContestCategory;
  entryId: string | null;
  votes: number;
  /** The next costume had as many votes (the earlier entry got the prize). */
  tied: boolean;
};

/** Votes per entry per prize, ignoring voided votes and removed prizes. */
async function tallyVotes(contest: Contest): Promise<Map<string, Record<string, number>>> {
  const known = new Set(contest.categories.map((c) => c.id));
  const { rows } = await sql`
    select entry_id, category, count(*) as n from photo_contest_votes
    where contest_id = ${contest.id} and not voided
    group by entry_id, category
  `;
  const tally = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (!known.has(r.category as string)) continue;
    const entry = tally.get(r.entry_id as string) ?? {};
    entry[r.category as string] = Number(r.n);
    tally.set(r.entry_id as string, entry);
  }
  return tally;
}

/**
 * Picks each prize's winner in the order the prizes are listed. With
 * "one prize per costume" on, a costume that already won is skipped and
 * the next most-voted gets it. Ties go to the earlier entry.
 */
function pickWinners(
  contest: Contest,
  entries: { id: string; createdAt: string }[],
  tally: Map<string, Record<string, number>>,
): CategoryWinner[] {
  const taken = new Set<string>();
  return contest.categories.map((category) => {
    const ranked = entries
      .map((e) => ({ id: e.id, createdAt: e.createdAt, votes: tally.get(e.id)?.[category.id] ?? 0 }))
      .filter((e) => e.votes > 0 && !(contest.onePrizeEach && taken.has(e.id)))
      .sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt));
    const top = ranked[0];
    if (!top) return { category, entryId: null, votes: 0, tied: false };
    taken.add(top.id);
    return { category, entryId: top.id, votes: top.votes, tied: ranked[1]?.votes === top.votes };
  });
}

/**
 * Live entries for the vote page. While voting is open each phone sees its
 * own shuffled order (so entry #1 doesn't get every top-of-page vote) and
 * no counts; once it's closed, everyone sees the results.
 */
export async function listVoteEntries(
  contest: Contest,
  deviceId: string | null,
): Promise<{ entries: VoteEntry[]; winners: CategoryWinner[] }> {
  await ensureSchema();
  const { rows } = await sql`
    select e.id, e.number, e.name, e.costume, e.width, e.height, e.created_at
    from photo_contest_entries e
    where e.contest_id = ${contest.id} and e.status = 'live'
    order by md5(${deviceId ?? ""}::text || e.id::text)
  `;
  const entries: (VoteEntry & { createdAt: string })[] = rows.map((r) => ({
    id: r.id as string,
    number: Number(r.number),
    name: r.name as string,
    costume: r.costume as string,
    width: Number(r.width),
    height: Number(r.height),
    thumb: publicPhotoUrl(photoKey(contest.date, r.id as string, "thumb")),
    view: publicPhotoUrl(photoKey(contest.date, r.id as string, "view")),
    votes: null,
    total: null,
    wins: [],
    createdAt: iso(r.created_at),
  }));
  const strip = (list: typeof entries): VoteEntry[] => list.map(({ createdAt: _c, ...e }) => (void _c, e));
  if (contest.voting !== "after") return { entries: strip(entries), winners: [] };

  const tally = await tallyVotes(contest);
  const winners = pickWinners(contest, entries, tally);
  for (const e of entries) {
    e.votes = tally.get(e.id) ?? {};
    e.total = Object.values(e.votes).reduce((n, v) => n + v, 0);
    e.wins = winners.filter((w) => w.entryId === e.id).map((w) => w.category.name);
  }
  // Winners first (in prize order), then everyone else by votes.
  const order = (e: (typeof entries)[number]) => {
    const i = winners.findIndex((w) => w.entryId === e.id);
    return i === -1 ? Infinity : i;
  };
  entries.sort((a, b) => order(a) - order(b) || (b.total ?? 0) - (a.total ?? 0) || a.createdAt.localeCompare(b.createdAt));
  return { entries: strip(entries), winners };
}

// ---------------------------------------------------------------------------
// Votes and reports
// ---------------------------------------------------------------------------

export type VoteResult = { ok: true; entryId: string } | { ok: false; error: string; status: number; entryId?: string };

export async function castVote(input: {
  contest: Contest;
  entryId: string;
  categoryId: string;
  deviceId: string;
  ip: string | null;
}): Promise<VoteResult> {
  await ensureSchema();
  const { contest } = input;
  if (contest.voting === "before") return { ok: false, error: "Voting hasn't opened yet.", status: 409 };
  if (contest.voting === "after") return { ok: false, error: "Voting is closed.", status: 409 };
  const category = contest.categories.find((c) => c.id === input.categoryId);
  if (!category) return { ok: false, error: "Pick a prize to vote for.", status: 400 };

  const mine = await getMyVotes(contest.id, input.deviceId);
  if (mine[category.id]) {
    return { ok: false, error: `You've already voted for ${category.name}. Votes are final.`, status: 409, entryId: mine[category.id] };
  }

  const { rows: entry } = await sql`
    select id from photo_contest_entries where id = ${input.entryId} and contest_id = ${contest.id} and status = 'live' limit 1
  `;
  if (!entry[0]) return { ok: false, error: "That entry isn't in the running anymore.", status: 404 };

  if (input.ip) {
    const { rows } = await sql`
      select count(*) as n from photo_contest_votes
      where contest_id = ${contest.id} and ip = ${input.ip} and created_at > now() - interval '1 minute'
    `;
    if (Number(rows[0]?.n ?? 0) >= VOTES_PER_IP_MINUTE * contest.categories.length) {
      return { ok: false, error: "Lots of votes from this connection right now. Try again in a minute.", status: 429 };
    }
  }

  const { rows } = await sql`
    insert into photo_contest_votes (contest_id, device_id, category, entry_id, ip)
    values (${contest.id}, ${input.deviceId}, ${category.id}, ${input.entryId}, ${input.ip})
    on conflict (contest_id, device_id, category) do nothing
    returning entry_id
  `;
  if (!rows[0]) {
    const already = await getMyVotes(contest.id, input.deviceId);
    return { ok: false, error: `You've already voted for ${category.name}. Votes are final.`, status: 409, entryId: already[category.id] };
  }
  return { ok: true, entryId: input.entryId };
}

/** This phone's votes: prize id to entry id. */
export async function getMyVotes(contestId: string, deviceId: string): Promise<Record<string, string>> {
  await ensureSchema();
  const { rows } = await sql`select category, entry_id from photo_contest_votes where contest_id = ${contestId} and device_id = ${deviceId}`;
  return Object.fromEntries(rows.map((r) => [r.category as string, r.entry_id as string]));
}

/** One report per phone per entry. Enough reports hide it until staff look. */
export async function reportEntry(entryId: string, deviceId: string): Promise<{ ok: boolean; hidden: boolean }> {
  await ensureSchema();
  const { rows: added } = await sql`
    insert into photo_contest_reports (entry_id, device_id) values (${entryId}, ${deviceId})
    on conflict do nothing returning entry_id
  `;
  if (!added[0]) return { ok: true, hidden: false };
  const { rows } = await sql`
    update photo_contest_entries e set report_count = report_count + 1
    from photo_contests c
    where e.id = ${entryId} and c.id = e.contest_id
    returning e.report_count, e.status, e.staff_approved, c.hide_after_reports
  `;
  const r = rows[0];
  if (!r) return { ok: false, hidden: false };
  const threshold = Number(r.hide_after_reports);
  if (r.status === "live" && !r.staff_approved && threshold > 0 && Number(r.report_count) >= threshold) {
    await sql`update photo_contest_entries set status = 'held', hold_reason = ${`Reported ${r.report_count} times`} where id = ${entryId}`;
    return { ok: true, hidden: true };
  }
  return { ok: true, hidden: false };
}

// ---------------------------------------------------------------------------
// Staff dashboard
// ---------------------------------------------------------------------------

export type AdminEntry = {
  id: string;
  number: number;
  name: string;
  costume: string;
  status: EntryStatus;
  reason: string | null;
  reports: number;
  approved: boolean;
  /** Votes per prize id. */
  votes: Record<string, number>;
  total: number;
  /** Prizes it's winning (or won). */
  wins: string[];
  thumb: string;
  view: string;
  createdAt: string;
};

export type VoteBurst = { ip: string; entryId: string; entry: string; categoryId: string; category: string; votes: number; from: string };

export type ContestDashboard = {
  contest: Contest;
  totals: { entries: number; live: number; held: number; votes: number; voters: number; voided: number };
  held: AdminEntry[];
  live: AdminEntry[];
  winners: CategoryWinner[];
  bursts: VoteBurst[];
};

export async function getContestDashboard(id: string): Promise<ContestDashboard | null> {
  const contest = await getContest(id);
  if (!contest) return null;
  const { rows } = await sql`
    select e.id, e.number, e.name, e.costume, e.status, e.hold_reason, e.report_count, e.staff_approved, e.created_at
    from photo_contest_entries e
    where e.contest_id = ${id} and e.status in ('live', 'held')
    order by e.number
  `;
  const tally = await tallyVotes(contest);
  const entries: AdminEntry[] = rows.map((r) => {
    const votes = tally.get(r.id as string) ?? {};
    return {
      id: r.id as string,
      number: Number(r.number),
      name: r.name as string,
      costume: r.costume as string,
      status: r.status as EntryStatus,
      reason: (r.hold_reason as string | null) ?? null,
      reports: Number(r.report_count),
      approved: Boolean(r.staff_approved),
      votes,
      total: Object.values(votes).reduce((n, v) => n + v, 0),
      wins: [],
      thumb: publicPhotoUrl(photoKey(contest.date, r.id as string, "thumb")),
      view: publicPhotoUrl(photoKey(contest.date, r.id as string, "view")),
      createdAt: iso(r.created_at),
    };
  });
  const live = entries.filter((e) => e.status === "live");
  const winners = pickWinners(contest, live, tally);
  for (const e of live) e.wins = winners.filter((w) => w.entryId === e.id).map((w) => w.category.name);
  live.sort((a, b) => b.total - a.total || a.createdAt.localeCompare(b.createdAt));

  const { rows: voteTotals } = await sql`
    select count(*) filter (where not voided) as votes, count(*) filter (where voided) as voided,
      count(distinct device_id) filter (where not voided) as voters
    from photo_contest_votes where contest_id = ${id}
  `;
  const { rows: burstRows } = await sql`
    select v.ip, v.entry_id, v.category, e.name, e.costume, count(*) as n,
      date_bin('5 minutes', v.created_at, timestamptz '2000-01-01') as bucket
    from photo_contest_votes v join photo_contest_entries e on e.id = v.entry_id
    where v.contest_id = ${id} and not v.voided and v.ip is not null
    group by v.ip, v.entry_id, v.category, e.name, e.costume, bucket
    having count(*) >= ${BURST_VOTES}
    order by n desc
  `;
  const categoryName = (cid: string) => contest.categories.find((c) => c.id === cid)?.name ?? "a removed prize";

  return {
    contest,
    totals: {
      entries: entries.length,
      live: live.length,
      held: entries.length - live.length,
      votes: Number(voteTotals[0]?.votes ?? 0),
      voters: Number(voteTotals[0]?.voters ?? 0),
      voided: Number(voteTotals[0]?.voided ?? 0),
    },
    held: entries.filter((e) => e.status === "held"),
    live,
    winners,
    bursts: burstRows.map((r) => ({
      ip: r.ip as string,
      entryId: r.entry_id as string,
      entry: (r.costume as string) || (r.name as string),
      categoryId: r.category as string,
      category: categoryName(r.category as string),
      votes: Number(r.n),
      from: iso(r.bucket),
    })),
  };
}

/** approve: show it (reports no longer hide it). hide: off the vote page, votes kept. */
export async function setEntryVisibility(entryId: string, action: "approve" | "hide") {
  await ensureSchema();
  if (action === "approve") {
    await sql`update photo_contest_entries set status = 'live', hold_reason = null, staff_approved = true where id = ${entryId} and status in ('live', 'held')`;
  } else {
    await sql`update photo_contest_entries set status = 'held', hold_reason = 'Hidden by staff' where id = ${entryId} and status in ('live', 'held')`;
  }
}

/**
 * Removes an entry for good: its files go, and anyone who voted for it
 * can vote again. The phone still can't enter a second time.
 */
export async function removeEntry(entryId: string): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`
    update photo_contest_entries e set status = 'removed', hold_reason = 'Removed by staff'
    from photo_contests c
    where e.id = ${entryId} and c.id = e.contest_id
    returning e.id, c.contest_date::text as date
  `;
  if (!rows[0]) return [];
  await sql`delete from photo_contest_votes where entry_id = ${entryId}`;
  const kept = await photoIdsInNights([entryId]);
  return kept.has(entryId) ? [] : entryKeys(rows[0].date as string, entryId);
}

/** Voids one burst of votes. Those phones stay locked (votes are final). */
export async function voidVoteBurst(contestId: string, ip: string, entryId: string, categoryId: string, from: string): Promise<number> {
  await ensureSchema();
  const { rows } = await sql`
    update photo_contest_votes set voided = true
    where contest_id = ${contestId} and ip = ${ip} and entry_id = ${entryId} and category = ${categoryId} and not voided
      and created_at >= ${from} and created_at < ${from}::timestamptz + interval '5 minutes'
    returning device_id
  `;
  return rows.length;
}

/**
 * Puts every live entry into Market Nights as its own block for the
 * event (separate from that date's regular photos), prize winners first
 * and captioned. Running it again adds anything new and refreshes captions.
 */
export async function moveContestToNight(id: string): Promise<{ ok: true; nightId: string; count: number } | { ok: false; error: string }> {
  const dashboard = await getContestDashboard(id);
  if (!dashboard) return { ok: false, error: "That photo event no longer exists." };
  const { contest, live, winners } = dashboard;
  if (contest.voting !== "after") return { ok: false, error: "Close voting first." };
  if (live.length === 0) return { ok: false, error: "There are no approved entries to move." };

  const { rows } = await sql`select id, width, height from photo_contest_entries where contest_id = ${id} and status = 'live'`;
  const size = new Map(rows.map((r) => [r.id as string, { width: Number(r.width), height: Number(r.height) }]));
  const firstWin = (entryId: string) => {
    const i = winners.findIndex((w) => w.entryId === entryId);
    return i === -1 ? Infinity : i;
  };
  const ordered = [...live].sort((a, b) => firstWin(a.id) - firstWin(b.id));
  const nightId = await upsertContestNight({
    contestId: contest.id,
    date: contest.date,
    title: contest.title,
    slug: contest.slug,
    items: ordered.map((entry, i) => {
      const who = [entry.name, entry.costume].filter(Boolean).join(" · ");
      return {
        id: entry.id,
        width: size.get(entry.id)?.width ?? 1200,
        height: size.get(entry.id)?.height ?? 1500,
        sortKey: String(i + 1).padStart(4, "0"),
        caption: entry.wins.length ? `🏆 ${entry.wins.join(" & ")} · ${who}` : who,
      };
    }),
  });
  await sql`update photo_contests set night_id = ${nightId} where id = ${id}`;
  return { ok: true, nightId, count: live.length };
}
