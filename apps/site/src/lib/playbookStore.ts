import { sql } from "@vercel/postgres";
import { publicPhotoUrl } from "./r2";
import type {
  BudgetLine,
  Item,
  KeyDate,
  Link,
  LookPhoto,
  Person,
  Play,
  PlayKind,
  PlaySummary,
  RunItem,
  Task,
} from "./playbookShared";

// Playbook: how this venue plans and runs the things it does every year
// (Christmas, NYE, launches). A play builds to one day; everything in it
// is stored as days before or after that day, so plays copy forward to
// next year and templates move between venues without re-dating anything.
//
// Templates are plays with is_template set. Copying a play (to next year,
// or from a template) duplicates its tasks, budget lines, supplies, key
// dates and run of show; look-book photos are shared, not re-uploaded.

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      create table if not exists playbook_people (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text not null default '',
        role text not null default 'management' check (role in ('management', 'staff')),
        active boolean not null default true,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists playbook_plays (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        kind text not null default 'holiday',
        target_date date not null,
        plan_start date,
        owner_id uuid,
        goal text not null default '',
        budget_cents bigint,
        notes text not null default '',
        next_time_notes text not null default '',
        last_time_notes text not null default '',
        kickoff_message text not null default '',
        emails_enabled boolean not null default true,
        kickoff_sent_at timestamptz,
        is_template boolean not null default false,
        archived boolean not null default false,
        copied_from uuid,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists playbook_tasks (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        phase text not null default '',
        title text not null,
        owner_id uuid,
        owner_label text not null default '',
        team text not null default '',
        offset_days int not null default 0,
        due_time text not null default '',
        notes text not null default '',
        links jsonb not null default '[]',
        cost_cents bigint,
        done_at timestamptz,
        reminded_on date,
        sort int not null default 0
      )
    `;
    await sql`create index if not exists playbook_tasks_play_idx on playbook_tasks (play_id)`;
    await sql`
      create table if not exists playbook_budget (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        category text not null default '',
        label text not null,
        planned_cents bigint,
        actual_cents bigint,
        vendor text not null default '',
        url text not null default '',
        notes text not null default '',
        sort int not null default 0
      )
    `;
    await sql`
      create table if not exists playbook_items (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        name text not null,
        qty text not null default '',
        stored text not null default '',
        url text not null default '',
        cost_cents bigint,
        cost_unit text not null default '',
        notes text not null default '',
        needs_reorder boolean not null default false,
        photo_key text,
        sort int not null default 0
      )
    `;
    await sql`
      create table if not exists playbook_photos (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        area text not null default '',
        caption text not null default '',
        year int not null,
        key text not null,
        sort int not null default 0,
        created_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists playbook_dates (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        offset_days int not null default 0,
        kind text not null default 'milestone',
        label text not null,
        sort int not null default 0
      )
    `;
    await sql`
      create table if not exists playbook_run (
        id uuid primary key default gen_random_uuid(),
        play_id uuid not null references playbook_plays(id) on delete cascade,
        offset_days int not null default 0,
        time_label text not null default '',
        what text not null,
        sort int not null default 0
      )
    `;
    // Owners are the venue's users now (venue_users keeps the same ids).
    const { ensureAccessSchema } = await import("./accessStore");
    await ensureAccessSchema();
    await sql`alter table playbook_plays drop constraint if exists playbook_plays_owner_id_fkey`;
    await sql`alter table playbook_tasks drop constraint if exists playbook_tasks_owner_id_fkey`;
    // Which task a copied task came from (so contacts follow the copy).
    await sql`alter table playbook_tasks add column if not exists copy_of uuid`;
    // One row per email that has gone out, so a re-run never sends twice.
    await sql`
      create table if not exists playbook_email_log (
        key text primary key,
        sent_at timestamptz not null default now()
      )
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const num = (v: unknown) => (v == null ? null : Number(v));

// ---------------------------------------------------------------------------
// Input cleaning
// ---------------------------------------------------------------------------

const text = (v: unknown, max = 4000) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const int = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(-3650, Math.min(3650, Math.round(n))) : fallback;
};
const cents = (v: unknown) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(-1e12, Math.min(1e12, Math.round(n))) : null;
};
const uuidOrNull = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));

/** Only http(s) links, so a pasted "javascript:" can never be clicked. */
export function safeUrl(v: unknown) {
  const s = text(v, 1000);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function links(v: unknown): Link[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((l) => ({ label: text(l?.label, 120), url: safeUrl(l?.url) }))
    .filter((l) => l.url)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// People: the venue's users (Settings → People). Anyone with "Playbook
// emails" access counts as management for the kickoff and Monday emails.
// ---------------------------------------------------------------------------

export async function listPeople(): Promise<Person[]> {
  const { listUsersWithAreas } = await import("./accessStore");
  const users = await listUsersWithAreas();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.areas.has("playbook_emails") ? "management" : "staff",
    active: u.status !== "disabled",
  }));
}

// ---------------------------------------------------------------------------
// Plays
// ---------------------------------------------------------------------------

const PLAY_FIELDS = {
  title: (v: unknown) => text(v, 120),
  kind: (v: unknown): PlayKind => (v === "event" || v === "project" ? v : "holiday"),
  target_date: (v: unknown) => (isDate(v) ? v : undefined),
  plan_start: (v: unknown) => (isDate(v) ? v : null),
  owner_id: uuidOrNull,
  goal: (v: unknown) => text(v, 600),
  budget_cents: cents,
  notes: (v: unknown) => text(v, 20000),
  next_time_notes: (v: unknown) => text(v, 20000),
  last_time_notes: (v: unknown) => text(v, 20000),
  kickoff_message: (v: unknown) => text(v, 4000),
  emails_enabled: (v: unknown) => v !== false,
  archived: (v: unknown) => v === true,
} as const;

/** camelCase body keys accepted for each column. */
const PLAY_KEYS: Record<string, keyof typeof PLAY_FIELDS> = {
  title: "title",
  kind: "kind",
  targetDate: "target_date",
  planStart: "plan_start",
  ownerId: "owner_id",
  goal: "goal",
  budgetCents: "budget_cents",
  notes: "notes",
  nextTimeNotes: "next_time_notes",
  lastTimeNotes: "last_time_notes",
  kickoffMessage: "kickoff_message",
  emailsEnabled: "emails_enabled",
  archived: "archived",
};

function summaryFrom(r: Record<string, unknown>): PlaySummary {
  return {
    id: r.id as string,
    title: r.title as string,
    kind: r.kind as PlayKind,
    targetDate: r.target_date as string,
    planStart: (r.plan_start as string | null) ?? null,
    ownerName: (r.owner_name as string | null) ?? "",
    isTemplate: Boolean(r.is_template),
    archived: Boolean(r.archived),
    total: Number(r.total ?? 0),
    done: Number(r.done ?? 0),
    overdue: Number(r.overdue ?? 0),
    budgetCents: num(r.budget_cents),
    spentCents: Number(r.spent ?? 0),
  };
}

const SUMMARY_SQL = `
  select p.id, p.title, p.kind, p.target_date::text as target_date, p.plan_start::text as plan_start,
    p.is_template, p.archived, p.budget_cents, o.name as owner_name,
    (select count(*) from playbook_tasks t where t.play_id = p.id) as total,
    (select count(*) from playbook_tasks t where t.play_id = p.id and t.done_at is not null) as done,
    (select count(*) from playbook_tasks t where t.play_id = p.id and t.done_at is null and p.target_date + t.offset_days < $1::date) as overdue,
    (select coalesce(sum(actual_cents), 0) from playbook_budget b where b.play_id = p.id) as spent
  from playbook_plays p left join venue_users o on o.id = p.owner_id`;

export async function listPlays(today: string): Promise<PlaySummary[]> {
  await ensureSchema();
  const { rows } = await sql.query(`${SUMMARY_SQL} order by p.is_template, p.archived, p.target_date`, [today]);
  return rows.map(summaryFrom);
}

export async function getPlay(id: string, today: string): Promise<Play | null> {
  if (!uuidOrNull(id)) return null;
  await ensureSchema();
  const { rows } = await sql.query(
    `${SUMMARY_SQL.replace("p.budget_cents, o.name as owner_name", "p.budget_cents, o.name as owner_name, p.owner_id, p.goal, p.notes, p.next_time_notes, p.last_time_notes, p.kickoff_message, p.emails_enabled, p.kickoff_sent_at, p.copied_from")} where p.id = $2`,
    [today, id],
  );
  const r = rows[0];
  if (!r) return null;
  const { playContacts } = await import("./contactsStore");
  const [tasks, budget, items, photos, dates, run, contacts] = await Promise.all([
    sql`select * from playbook_tasks where play_id = ${id} order by offset_days, sort, title`,
    sql`select * from playbook_budget where play_id = ${id} order by sort, category, label`,
    sql`select * from playbook_items where play_id = ${id} order by sort, name`,
    sql`select * from playbook_photos where play_id = ${id} order by year desc, sort, created_at`,
    sql`select * from playbook_dates where play_id = ${id} order by offset_days, sort`,
    sql`select * from playbook_run where play_id = ${id} order by offset_days, sort`,
    playContacts(id),
  ]);
  return {
    ...summaryFrom(r),
    ownerId: (r.owner_id as string | null) ?? null,
    goal: r.goal as string,
    notes: r.notes as string,
    nextTimeNotes: r.next_time_notes as string,
    lastTimeNotes: r.last_time_notes as string,
    kickoffMessage: r.kickoff_message as string,
    emailsEnabled: Boolean(r.emails_enabled),
    kickoffSentAt: iso(r.kickoff_sent_at),
    copiedFrom: (r.copied_from as string | null) ?? null,
    tasks: tasks.rows.map(toTask),
    budget: budget.rows.map(toBudget),
    items: items.rows.map(toItem),
    photos: photos.rows.map(toPhoto),
    dates: dates.rows.map(toDate),
    run: run.rows.map(toRun),
    contacts,
  };
}

export async function createPlay(input: Record<string, unknown>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureSchema();
  const title = PLAY_FIELDS.title(input.title);
  const target = PLAY_FIELDS.target_date(input.targetDate);
  if (!title) return { ok: false, error: "Give the play a name." };
  if (!target) return { ok: false, error: "Pick the day it builds to." };
  const isTemplate = input.isTemplate === true;
  const { rows } = await sql`
    insert into playbook_plays (title, kind, target_date, plan_start, owner_id, goal, budget_cents, is_template)
    values (${title}, ${PLAY_FIELDS.kind(input.kind)}, ${target}, ${PLAY_FIELDS.plan_start(input.planStart)},
      ${uuidOrNull(input.ownerId)}, ${PLAY_FIELDS.goal(input.goal)}, ${cents(input.budgetCents)}, ${isTemplate})
    returning id
  `;
  return { ok: true, id: rows[0].id as string };
}

export async function updatePlay(id: string, input: Record<string, unknown>) {
  await ensureSchema();
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(PLAY_KEYS)) {
    if (!(key in input)) continue;
    const value = PLAY_FIELDS[column](input[key]);
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  if (!sets.length) return;
  values.push(id);
  await sql.query(`update playbook_plays set ${sets.join(", ")}, updated_at = now() where id = $${values.length}`, values);
}

/** Deletes the play; returns photo keys no other play still uses. */
export async function deletePlay(id: string): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql`
    select key from playbook_photos where play_id = ${id}
    union select photo_key as key from playbook_items where play_id = ${id} and photo_key is not null
  `;
  await sql`delete from playbook_plays where id = ${id}`;
  const { ensureContactsSchema } = await import("./contactsStore");
  await ensureContactsSchema();
  await sql`delete from playbook_contact_links where play_id = ${id}`;
  return unusedKeys(rows.map((r) => r.key as string));
}

async function unusedKeys(prefixes: string[]): Promise<string[]> {
  const unused: string[] = [];
  for (const prefix of [...new Set(prefixes)]) {
    const { rows } = await sql`
      select 1 from playbook_photos where key = ${prefix}
      union all select 1 from playbook_items where photo_key = ${prefix} limit 1
    `;
    if (!rows[0]) unused.push(...photoKeys(prefix));
  }
  return unused;
}

/**
 * Copies a play (next year, or a new play from a template). Dates follow
 * the new day automatically; done marks and actual spend start fresh, and
 * "notes for next time" become the copy's "notes from last time".
 */
export async function copyPlay(
  sourceId: string,
  input: { title: string; targetDate: string; planStart?: string | null; asTemplate?: boolean; ownerId?: string | null },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureSchema();
  const title = text(input.title, 120);
  if (!title) return { ok: false, error: "Give the play a name." };
  if (!isDate(input.targetDate)) return { ok: false, error: "Pick the day it builds to." };
  const { rows: src } = await sql`select *, target_date::text as target_text, plan_start::text as plan_text from playbook_plays where id = ${sourceId}`;
  const s = src[0];
  if (!s) return { ok: false, error: "That play no longer exists." };

  // Keep the planning start the same distance before the day.
  let planStart = input.planStart ?? null;
  if (planStart === null && s.plan_text) {
    const lead = Math.round((Date.parse(`${s.target_text}T12:00:00Z`) - Date.parse(`${s.plan_text}T12:00:00Z`)) / 86400000);
    const d = new Date(`${input.targetDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - lead);
    planStart = d.toISOString().slice(0, 10);
  }
  const { rows } = await sql`
    insert into playbook_plays (title, kind, target_date, plan_start, owner_id, goal, budget_cents, notes,
      last_time_notes, kickoff_message, emails_enabled, is_template, copied_from)
    values (${title}, ${s.kind as string}, ${input.targetDate}, ${planStart}, ${input.ownerId === undefined ? (s.owner_id as string | null) : uuidOrNull(input.ownerId)},
      ${s.goal as string}, ${s.budget_cents as number | null}, ${s.notes as string},
      ${(s.next_time_notes as string) || (s.last_time_notes as string)}, ${s.kickoff_message as string},
      ${Boolean(s.emails_enabled)}, ${input.asTemplate === true}, ${sourceId})
    returning id
  `;
  const id = rows[0].id as string;
  await sql`
    insert into playbook_tasks (play_id, phase, title, owner_id, owner_label, team, offset_days, due_time, notes, links, cost_cents, sort, copy_of)
    select ${id}, phase, title, owner_id, owner_label, team, offset_days, due_time, notes, links, cost_cents, sort, id
    from playbook_tasks where play_id = ${sourceId}
  `;
  await sql`
    insert into playbook_budget (play_id, category, label, planned_cents, vendor, url, notes, sort)
    select ${id}, category, label, coalesce(actual_cents, planned_cents), vendor, url, notes, sort
    from playbook_budget where play_id = ${sourceId}
  `;
  await sql`
    insert into playbook_items (play_id, name, qty, stored, url, cost_cents, cost_unit, notes, needs_reorder, photo_key, sort)
    select ${id}, name, qty, stored, url, cost_cents, cost_unit, notes, needs_reorder, photo_key, sort
    from playbook_items where play_id = ${sourceId}
  `;
  await sql`
    insert into playbook_photos (play_id, area, caption, year, key, sort, created_at)
    select ${id}, area, caption, year, key, sort, created_at from playbook_photos where play_id = ${sourceId}
  `;
  await sql`
    insert into playbook_dates (play_id, offset_days, kind, label, sort)
    select ${id}, offset_days, kind, label, sort from playbook_dates where play_id = ${sourceId}
  `;
  await sql`
    insert into playbook_run (play_id, offset_days, time_label, what, sort)
    select ${id}, offset_days, time_label, what, sort from playbook_run where play_id = ${sourceId}
  `;
  const { copyPlayContacts } = await import("./contactsStore");
  await copyPlayContacts(sourceId, id);
  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// Things inside a play: tasks, budget lines, supplies, photos, dates, run of show
// ---------------------------------------------------------------------------

function toTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    phase: r.phase as string,
    title: r.title as string,
    ownerId: (r.owner_id as string | null) ?? null,
    ownerLabel: r.owner_label as string,
    team: r.team as string,
    offsetDays: Number(r.offset_days),
    dueTime: r.due_time as string,
    notes: r.notes as string,
    links: (typeof r.links === "string" ? JSON.parse(r.links) : r.links) as Link[],
    costCents: num(r.cost_cents),
    done: Boolean(r.done_at),
    doneAt: iso(r.done_at),
    sort: Number(r.sort),
  };
}
function toBudget(r: Record<string, unknown>): BudgetLine {
  return {
    id: r.id as string,
    category: r.category as string,
    label: r.label as string,
    plannedCents: num(r.planned_cents),
    actualCents: num(r.actual_cents),
    vendor: r.vendor as string,
    url: r.url as string,
    notes: r.notes as string,
    sort: Number(r.sort),
  };
}
export const photoKeys = (prefix: string) => ["full", "view", "thumb"].map((size) => `${prefix}/${size}.jpg`);
const photoUrls = (prefix: string) => ({ thumb: publicPhotoUrl(`${prefix}/thumb.jpg`), view: publicPhotoUrl(`${prefix}/view.jpg`) });
function toItem(r: Record<string, unknown>): Item {
  const key = (r.photo_key as string | null) ?? null;
  return {
    id: r.id as string,
    name: r.name as string,
    qty: r.qty as string,
    stored: r.stored as string,
    url: r.url as string,
    costCents: num(r.cost_cents),
    costUnit: r.cost_unit as string,
    notes: r.notes as string,
    needsReorder: Boolean(r.needs_reorder),
    photo: key ? photoUrls(key) : null,
    photoKey: key,
    sort: Number(r.sort),
  };
}
function toPhoto(r: Record<string, unknown>): LookPhoto {
  return {
    id: r.id as string,
    area: r.area as string,
    caption: r.caption as string,
    year: Number(r.year),
    key: r.key as string,
    ...photoUrls(r.key as string),
    sort: Number(r.sort),
  };
}
function toDate(r: Record<string, unknown>): KeyDate {
  return { id: r.id as string, offsetDays: Number(r.offset_days), kind: r.kind as KeyDate["kind"], label: r.label as string, sort: Number(r.sort) };
}
function toRun(r: Record<string, unknown>): RunItem {
  return { id: r.id as string, offsetDays: Number(r.offset_days), timeLabel: r.time_label as string, what: r.what as string, sort: Number(r.sort) };
}

type Field = { column: string; clean: (v: unknown) => unknown; required?: boolean };

/** What each kind of row accepts, keyed by the camelCase names the screens send. */
const COLLECTIONS: Record<string, { table: string; fields: Record<string, Field> }> = {
  tasks: {
    table: "playbook_tasks",
    fields: {
      phase: { column: "phase", clean: (v) => text(v, 80) },
      title: { column: "title", clean: (v) => text(v, 300), required: true },
      ownerId: { column: "owner_id", clean: uuidOrNull },
      ownerLabel: { column: "owner_label", clean: (v) => text(v, 80) },
      team: { column: "team", clean: (v) => text(v, 40) },
      offsetDays: { column: "offset_days", clean: (v) => int(v) },
      dueTime: { column: "due_time", clean: (v) => text(v, 40) },
      notes: { column: "notes", clean: (v) => text(v, 8000) },
      links: { column: "links", clean: (v) => JSON.stringify(links(v)) },
      costCents: { column: "cost_cents", clean: cents },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
  budget: {
    table: "playbook_budget",
    fields: {
      category: { column: "category", clean: (v) => text(v, 60) },
      label: { column: "label", clean: (v) => text(v, 200), required: true },
      plannedCents: { column: "planned_cents", clean: cents },
      actualCents: { column: "actual_cents", clean: cents },
      vendor: { column: "vendor", clean: (v) => text(v, 120) },
      url: { column: "url", clean: safeUrl },
      notes: { column: "notes", clean: (v) => text(v, 4000) },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
  items: {
    table: "playbook_items",
    fields: {
      name: { column: "name", clean: (v) => text(v, 200), required: true },
      qty: { column: "qty", clean: (v) => text(v, 60) },
      stored: { column: "stored", clean: (v) => text(v, 120) },
      url: { column: "url", clean: safeUrl },
      costCents: { column: "cost_cents", clean: cents },
      costUnit: { column: "cost_unit", clean: (v) => text(v, 40) },
      notes: { column: "notes", clean: (v) => text(v, 4000) },
      needsReorder: { column: "needs_reorder", clean: (v) => v === true },
      photoKey: { column: "photo_key", clean: (v) => (typeof v === "string" && /^playbook\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(v) ? v : null) },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
  photos: {
    table: "playbook_photos",
    fields: {
      area: { column: "area", clean: (v) => text(v, 120) },
      caption: { column: "caption", clean: (v) => text(v, 2000) },
      year: { column: "year", clean: (v) => Math.max(2000, Math.min(2100, int(v, new Date().getFullYear()))), required: true },
      key: { column: "key", clean: (v) => (typeof v === "string" && /^playbook\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(v) ? v : ""), required: true },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
  dates: {
    table: "playbook_dates",
    fields: {
      offsetDays: { column: "offset_days", clean: (v) => int(v) },
      kind: { column: "kind", clean: (v) => (v === "hours" || v === "party" ? v : "milestone") },
      label: { column: "label", clean: (v) => text(v, 200), required: true },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
  run: {
    table: "playbook_run",
    fields: {
      offsetDays: { column: "offset_days", clean: (v) => int(v) },
      timeLabel: { column: "time_label", clean: (v) => text(v, 40) },
      what: { column: "what", clean: (v) => text(v, 300), required: true },
      sort: { column: "sort", clean: (v) => int(v) },
    },
  },
};

export const isCollection = (name: string) => name in COLLECTIONS;

export async function addRow(playId: string, collection: string, input: Record<string, unknown>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureSchema();
  const spec = COLLECTIONS[collection];
  if (!spec) return { ok: false, error: "Unknown list." };
  const columns = ["play_id"];
  const values: unknown[] = [playId];
  for (const [key, field] of Object.entries(spec.fields)) {
    const value = key in input ? field.clean(input[key]) : undefined;
    if (field.required && (value === undefined || value === "" || value === null)) {
      return { ok: false, error: "Fill in the name first." };
    }
    if (value === undefined) continue;
    columns.push(field.column);
    values.push(value);
  }
  const { rows } = await sql.query(
    `insert into ${spec.table} (${columns.join(", ")}) values (${values.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    values,
  );
  return { ok: true, id: rows[0].id as string };
}

export async function updateRow(playId: string, collection: string, rowId: string, input: Record<string, unknown>) {
  await ensureSchema();
  const spec = COLLECTIONS[collection];
  if (!spec || !uuidOrNull(rowId)) return;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, field] of Object.entries(spec.fields)) {
    if (!(key in input)) continue;
    const value = field.clean(input[key]);
    if (field.required && (value === "" || value === null)) continue;
    values.push(value);
    sets.push(`${field.column} = $${values.length}`);
  }
  if (collection === "tasks" && "done" in input) sets.push(input.done ? "done_at = coalesce(done_at, now())" : "done_at = null");
  if (!sets.length) return;
  values.push(rowId, playId);
  await sql.query(`update ${spec.table} set ${sets.join(", ")} where id = $${values.length - 1} and play_id = $${values.length}`, values);
  await sql`update playbook_plays set updated_at = now() where id = ${playId}`;
}

/** Removes a row; returns photo files nothing else uses any more. */
export async function deleteRow(playId: string, collection: string, rowId: string): Promise<string[]> {
  await ensureSchema();
  const spec = COLLECTIONS[collection];
  if (!spec || !uuidOrNull(rowId)) return [];
  const keyColumn = collection === "photos" ? "key" : collection === "items" ? "photo_key" : null;
  const { rows } = await sql.query(
    `delete from ${spec.table} where id = $1 and play_id = $2 returning ${keyColumn ?? "null"} as key`,
    [rowId, playId],
  );
  if (collection === "tasks") {
    const { ensureContactsSchema } = await import("./contactsStore");
    await ensureContactsSchema();
    await sql`delete from playbook_contact_links where task_id = ${rowId}`;
  }
  const key = rows[0]?.key as string | null | undefined;
  return key ? unusedKeys([key]) : [];
}

// ---------------------------------------------------------------------------
// Templates between venues: a play as a portable file (no photos, no people)
// ---------------------------------------------------------------------------

export type PlayExport = {
  format: "playbook-play@1";
  title: string;
  kind: PlayKind;
  /** Days from the planning start to the day. */
  leadDays: number | null;
  goal: string;
  budgetCents: number | null;
  notes: string;
  kickoffMessage: string;
  tasks: { phase: string; title: string; team: string; ownerLabel: string; offsetDays: number; dueTime: string; notes: string; links: Link[]; costCents: number | null }[];
  budget: { category: string; label: string; plannedCents: number | null; vendor: string; url: string; notes: string }[];
  items: { name: string; qty: string; stored: string; url: string; costCents: number | null; costUnit: string; notes: string }[];
  dates: { offsetDays: number; kind: string; label: string }[];
  run: { offsetDays: number; timeLabel: string; what: string }[];
};

export function exportPlay(play: Play, people: Person[]): PlayExport {
  const ownerName = (id: string | null, label: string) => people.find((p) => p.id === id)?.name ?? label;
  return {
    format: "playbook-play@1",
    title: play.title,
    kind: play.kind,
    leadDays: play.planStart ? Math.round((Date.parse(play.targetDate) - Date.parse(play.planStart)) / 86400000) : null,
    goal: play.goal,
    budgetCents: play.budgetCents,
    notes: play.notes,
    kickoffMessage: play.kickoffMessage,
    tasks: play.tasks.map((t) => ({
      phase: t.phase,
      title: t.title,
      team: t.team,
      ownerLabel: ownerName(t.ownerId, t.ownerLabel),
      offsetDays: t.offsetDays,
      dueTime: t.dueTime,
      notes: t.notes,
      links: t.links,
      costCents: t.costCents,
    })),
    budget: play.budget.map((b) => ({ category: b.category, label: b.label, plannedCents: b.plannedCents ?? b.actualCents, vendor: b.vendor, url: b.url, notes: b.notes })),
    items: play.items.map((i) => ({ name: i.name, qty: i.qty, stored: i.stored, url: i.url, costCents: i.costCents, costUnit: i.costUnit, notes: i.notes })),
    dates: play.dates.map((d) => ({ offsetDays: d.offsetDays, kind: d.kind, label: d.label })),
    run: play.run.map((r) => ({ offsetDays: r.offsetDays, timeLabel: r.timeLabel, what: r.what })),
  };
}

/** Creates a template (or a dated play) from an exported file. */
export async function importPlay(file: unknown, input: { targetDate: string; asTemplate: boolean }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const f = file as Partial<PlayExport> | null;
  if (!f || f.format !== "playbook-play@1" || typeof f.title !== "string") return { ok: false, error: "That isn't a Playbook file." };
  let planStart: string | null = null;
  if (typeof f.leadDays === "number" && isDate(input.targetDate)) {
    const d = new Date(`${input.targetDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - f.leadDays);
    planStart = d.toISOString().slice(0, 10);
  }
  const created = await createPlay({ title: f.title, kind: f.kind, targetDate: input.targetDate, planStart, goal: f.goal, budgetCents: f.budgetCents, isTemplate: input.asTemplate });
  if (!created.ok) return created;
  const id = created.id;
  await updatePlay(id, { notes: f.notes ?? "", kickoffMessage: f.kickoffMessage ?? "" });
  const list = <T>(v: unknown) => (Array.isArray(v) ? (v as T[]).slice(0, 500) : []);
  for (const [i, t] of list<Record<string, unknown>>(f.tasks).entries()) await addRow(id, "tasks", { ...t, sort: i });
  for (const [i, b] of list<Record<string, unknown>>(f.budget).entries()) await addRow(id, "budget", { ...b, sort: i });
  for (const [i, it] of list<Record<string, unknown>>(f.items).entries()) await addRow(id, "items", { ...it, photoKey: undefined, sort: i });
  for (const [i, d] of list<Record<string, unknown>>(f.dates).entries()) await addRow(id, "dates", { ...d, sort: i });
  for (const [i, r] of list<Record<string, unknown>>(f.run).entries()) await addRow(id, "run", { ...r, sort: i });
  return { ok: true, id };
}

// ---------------------------------------------------------------------------
// Emails (see playbookEmails.ts)
// ---------------------------------------------------------------------------

/** Claims an email so overlapping runs send it once. */
export async function claimEmail(key: string): Promise<boolean> {
  await ensureSchema();
  const { rows } = await sql`insert into playbook_email_log (key) values (${key}) on conflict do nothing returning key`;
  return rows.length > 0;
}

export async function releaseEmail(key: string) {
  await ensureSchema();
  await sql`delete from playbook_email_log where key = ${key}`;
}

/** Real (non-template, not archived) plays with emails on. */
export async function listEmailPlays(today: string): Promise<Play[]> {
  await ensureSchema();
  const { rows } = await sql`
    select id from playbook_plays
    where not is_template and not archived and emails_enabled
      and plan_start is not null and plan_start <= ${today}::date
      and target_date >= ${today}::date - 30
  `;
  const plays = await Promise.all(rows.map((r) => getPlay(r.id as string, today)));
  return plays.filter((p): p is Play => Boolean(p));
}

export async function markKickoffSent(playId: string) {
  await ensureSchema();
  await sql`update playbook_plays set kickoff_sent_at = now() where id = ${playId}`;
}

export type DueTask = { playId: string; playTitle: string; taskId: string; title: string; team: string; owner: string; due: string; late: boolean };

/** Open tasks across live plays that are late or due in the next `days`. */
export async function listDueSoon(today: string, days = 7): Promise<DueTask[]> {
  await ensureSchema();
  const { rows } = await sql`
    select p.id as play_id, p.title as play_title, t.id, t.title, t.team,
      coalesce(o.name, t.owner_label) as owner, (p.target_date + t.offset_days)::text as due
    from playbook_tasks t
    join playbook_plays p on p.id = t.play_id
    left join venue_users o on o.id = t.owner_id
    where not p.is_template and not p.archived and t.done_at is null
      and (p.plan_start is null or p.plan_start <= ${today}::date + ${days}::int)
      and p.target_date + t.offset_days <= ${today}::date + ${days}::int
    order by p.target_date + t.offset_days, t.sort
    limit 60
  `;
  return rows.map((r) => ({
    playId: r.play_id as string,
    playTitle: r.play_title as string,
    taskId: r.id as string,
    title: r.title as string,
    team: r.team as string,
    owner: (r.owner as string | null) ?? "",
    due: r.due as string,
    late: (r.due as string) < today,
  }));
}
