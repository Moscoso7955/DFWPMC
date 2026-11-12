import { sql } from "@vercel/postgres";

// Operating costs for the Analytics card: what it costs to run the market's
// site each month. Some lines are pulled from the service itself (Vercel's
// bill, Anthropic's cost report), some are worked out from what the site
// records (Claude photo checks, emails sent, photo storage), and the rest
// are fixed amounts entered in the card (Google Workspace per person, the
// domain per year, and so on).

const USE_DB = Boolean(process.env.POSTGRES_URL);
const VERCEL_TEAM_ID = process.env.VERCEL_BILLING_TEAM_ID || "team_ZtKzyUJEnKp68kFvqIr0KIf4";
// This site's project; the team's bill also covers its other projects.
const VERCEL_PROJECT_ID = process.env.VERCEL_BILLING_PROJECT_ID || "prj_0yiKHqxRALEof3COgN3z7z3kQmXO";
const VERCEL_API = (process.env.VERCEL_API_BASE_URL || "https://api.vercel.com").replace(/\/$/, "");
const ANTHROPIC_API = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

// Claude prices per million tokens (input, output), from Anthropic's
// published rates. Used only when there's no Anthropic admin key.
const CLAUDE_PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

// Cloudflare R2: $0.015 per GB-month after the first 10 GB.
const R2_FREE_GB = 10;
const R2_PER_GB = 0.015;

export type FixedPer = "month" | "year" | "user";
/** `split`: how many apps or businesses share the bill; this site counts its share. */
export type FixedCost = { id: string; name: string; per: FixedPer; amountCents: number; users: number; split: number };

export type OpexLine = {
  key: string;
  label: string;
  detail: string;
  usd: number | null;
  how: "auto" | "estimate" | "fixed";
};
export type OpexMonth = { key: string; label: string; lines: OpexLine[]; total: number; tickets: number };
export type OpexSummary = {
  thisMonth: OpexMonth;
  lastMonth: OpexMonth;
  /** Year to date: the months above added together. */
  ytd: OpexMonth;
  fixed: FixedCost[];
  updatedAt: string | null;
  vercelConnected: boolean;
  anthropicExact: boolean;
  /** Problems the self-check found; empty when everything adds up. */
  issues: string[];
  /** The day software costs start counting (YYYY-MM-DD), or null for the site's launch. */
  costsStart: string | null;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        create table if not exists opex_fixed (
          id text primary key,
          name text not null,
          per text not null default 'month',
          amount_cents int not null default 0,
          users int not null default 1,
          sort int not null default 0
        )
      `;
      await sql`
        create table if not exists opex_usage (
          id bigserial primary key,
          kind text not null,
          qty int not null default 1,
          cost_usd numeric not null default 0,
          created_at timestamptz not null default now()
        )
      `;
      await sql`create index if not exists opex_usage_kind_idx on opex_usage (kind, created_at)`;
      await sql`
        create table if not exists opex_vercel_days (
          day date primary key,
          billed_usd numeric not null,
          fetched_at timestamptz not null default now()
        )
      `;
      await sql`
        create table if not exists opex_cache (
          key text primary key,
          value jsonb not null,
          fetched_at timestamptz not null default now()
        )
      `;
      // Starter list, once: the fixed costs we know the site has.
      const { rows } = await sql`select count(*)::int as n from opex_fixed`;
      const { rows: seeded } = await sql`select 1 from opex_cache where key = 'fixed_seeded'`;
      if (!seeded.length && Number(rows[0]?.n) === 0) {
        const starters: [string, FixedPer, number, number][] = [
          ["Google Workspace", "user", 0, 1],
          ["Domain (fwpublicmarket.com)", "year", 0, 1],
          ["Resend email plan", "month", 0, 1],
          ["Neon database plan", "month", 0, 1],
        ];
        for (const [i, [name, per, cents, users]] of starters.entries()) {
          await sql`insert into opex_fixed (id, name, per, amount_cents, users, sort) values (${crypto.randomUUID()}, ${name}, ${per}, ${cents}, ${users}, ${i})`;
        }
      }
      await sql`insert into opex_cache (key, value) values ('fixed_seeded', 'true'::jsonb) on conflict (key) do nothing`;
      await sql`alter table opex_fixed add column if not exists split int not null default 1`;
      // Once: the first starter list carried two lines copied from another
      // site; rename the domain and drop the Apple row if nobody touched them.
      const { rows: starterFix } = await sql`select 1 from opex_cache where key = 'starters_fixed'`;
      if (!starterFix.length) {
        await sql`update opex_fixed set name = 'Domain (fwpublicmarket.com)' where name = 'Domain (barphoebe.com)'`;
        await sql`delete from opex_fixed where name = 'Apple Developer (Wallet passes)' and amount_cents = 9900`;
        await sql`insert into opex_cache (key, value) values ('starters_fixed', 'true'::jsonb) on conflict (key) do nothing`;
      }
      // Vercel days split three ways: this site's project, team-wide costs
      // (plan, seats, untagged usage) and the team's other projects. Days
      // stored before the split are refetched.
      await sql`alter table opex_vercel_days add column if not exists site_usd numeric`;
      await sql`alter table opex_vercel_days add column if not exists team_usd numeric`;
      await sql`alter table opex_vercel_days add column if not exists other_usd numeric`;
      await sql`delete from opex_vercel_days where site_usd is null`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Recording usage (never lets a failure reach the caller)
// ---------------------------------------------------------------------------

/** One Claude call, priced from its token counts. */
export async function recordClaudeUsage(model: string, usage: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | null | undefined) {
  if (!USE_DB || !usage) return;
  try {
    const [inPrice, outPrice] = CLAUDE_PRICES[model] ?? CLAUDE_PRICES["claude-opus-5-5"];
    const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    const cost = (input * inPrice + (usage.output_tokens ?? 0) * outPrice) / 1_000_000;
    await ensureSchema();
    await sql`insert into opex_usage (kind, qty, cost_usd) values ('claude', 1, ${cost})`;
  } catch {
    // Counting costs must never break the feature.
  }
}

/** Emails handed to Resend. */
export async function recordEmailsSent(count = 1) {
  if (!USE_DB || count <= 0) return;
  try {
    await ensureSchema();
    await sql`insert into opex_usage (kind, qty) values ('email', ${count})`;
  } catch {
    // Counting costs must never break sending.
  }
}

// ---------------------------------------------------------------------------
// Fixed costs
// ---------------------------------------------------------------------------

export async function listFixedCosts(): Promise<FixedCost[]> {
  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`select * from opex_fixed order by sort, name`;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    per: (["month", "year", "user"].includes(String(r.per)) ? r.per : "month") as FixedPer,
    amountCents: Number(r.amount_cents),
    users: Number(r.users),
    split: Math.max(1, Number(r.split ?? 1)),
  }));
}

/** Replaces the whole list with what the card's editor sends. */
export async function saveFixedCosts(input: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!USE_DB) return { ok: false, error: "No database." };
  if (!Array.isArray(input) || input.length > 40) return { ok: false, error: "Send a list of costs." };
  const clean: FixedCost[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const name = String(raw?.name ?? "").trim().slice(0, 80);
    if (!name) continue;
    const per = (["month", "year", "user"].includes(String(raw.per)) ? raw.per : "month") as FixedPer;
    const amountCents = Math.round(Number(raw.amountCents));
    const users = Math.round(Number(raw.users));
    if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_00) return { ok: false, error: `Check the price for ${name}.` };
    if (per === "user" && (!Number.isFinite(users) || users < 0 || users > 500)) return { ok: false, error: `Check the number of people for ${name}.` };
    const split = Math.round(Number(raw.split ?? 1));
    if (!Number.isFinite(split) || split < 1 || split > 50) return { ok: false, error: `Check how many share ${name}.` };
    const id = typeof raw.id === "string" && /^[0-9a-f-]{36}$/.test(raw.id) ? raw.id : crypto.randomUUID();
    clean.push({ id, name, per, amountCents, users: per === "user" ? users : 1, split });
  }
  await ensureSchema();
  await sql`delete from opex_fixed`;
  for (const [i, c] of clean.entries()) {
    await sql`insert into opex_fixed (id, name, per, amount_cents, users, split, sort) values (${c.id}, ${c.name}, ${c.per}, ${c.amountCents}, ${c.users}, ${c.split}, ${i})`;
  }
  return { ok: true };
}

/** A fixed cost as a monthly amount in dollars. */
export function fixedMonthly(c: Pick<FixedCost, "per" | "amountCents" | "users"> & { split?: number }) {
  const share = Math.max(1, c.split ?? 1);
  if (c.per === "year") return c.amountCents / 100 / 12 / share;
  if (c.per === "user") return (c.amountCents * c.users) / 100 / share;
  return c.amountCents / 100 / share;
}

// ---------------------------------------------------------------------------
// Months (UTC calendar months, matching how the services bill)
// ---------------------------------------------------------------------------

type Month = { key: string; start: Date; end: Date; label: string };

function monthOf(offset: number, now = new Date()): Month {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return {
    key: start.toISOString().slice(0, 7),
    start,
    end,
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Pulling from the services (run by the cron and the card's Refresh)
// ---------------------------------------------------------------------------

type VercelDay = { total: number; site: number; team: number; other: number };

async function fetchVercelDay(date: string): Promise<VercelDay> {
  const from = `${date}T00:00:00.000Z`;
  const next = new Date(Date.parse(from) + 86_400_000).toISOString();
  const url = `${VERCEL_API}/v1/billing/charges?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(next)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Vercel billing ${res.status}`);
  const text = await res.text();
  // The charges come as one JSON record per line (or, defensively, one array).
  const out: VercelDay = { total: 0, site: 0, team: 0, other: 0 };
  const add = (r: unknown) => {
    const rec = r as { BilledCost?: unknown; Tags?: { ProjectId?: string; ProjectName?: string } | null };
    const cost = Number(rec?.BilledCost);
    if (!Number.isFinite(cost)) return;
    out.total += cost;
    const project = rec.Tags?.ProjectId;
    if (!project) out.team += cost;
    else if (project === VERCEL_PROJECT_ID || rec.Tags?.ProjectName === "fwpublicmarket") out.site += cost;
    else out.other += cost;
  };
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) (JSON.parse(trimmed) as unknown[]).forEach(add);
  else
    for (const line of trimmed.split("\n")) {
      if (!line.trim()) continue;
      try {
        add(JSON.parse(line));
      } catch {
        // Skip a malformed line rather than lose the day.
      }
    }
  return out;
}

/** How many projects share the team's costs, from Vercel's own list. */
async function fetchVercelProjectCount(): Promise<number> {
  let count = 0;
  let until: string | null = null;
  for (let i = 0; i < 5; i++) {
    const url = `${VERCEL_API}/v9/projects?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}&limit=100${until ? `&until=${until}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`Vercel projects ${res.status}`);
    const body = (await res.json()) as { projects?: unknown[]; pagination?: { next?: number | null } };
    count += body.projects?.length ?? 0;
    if (!body.pagination?.next) break;
    until = String(body.pagination.next);
  }
  return Math.max(1, count);
}

async function refreshVercel(now: Date, budget: number) {
  if (!process.env.VERCEL_API_TOKEN) return 0;
  await cacheSet("vercel_projects", await fetchVercelProjectCount());
  await recordSiteStart();
  const start = (await refreshMonths(now))[0].start;
  const today = day(now);
  const yesterday = day(new Date(now.getTime() - 86_400_000));
  const { rows } = await sql`select to_char(day, 'YYYY-MM-DD') as day, fetched_at from opex_vercel_days where day >= ${day(start)}`;
  const have = new Map(rows.map((r) => [String(r.day), new Date(r.fetched_at as string)]));
  const due: string[] = [];
  for (let d = new Date(start); day(d) <= today; d = new Date(d.getTime() + 86_400_000)) {
    const key = day(d);
    const fetched = have.get(key);
    // Recent days keep changing until Vercel settles them; refetch for 3 days after.
    const settled = fetched && fetched.getTime() > Date.parse(`${key}T00:00:00Z`) + 3 * 86_400_000;
    if (!fetched || (!settled && (key === today || key === yesterday || now.getTime() - fetched.getTime() > 6 * 3_600_000))) due.push(key);
  }
  // Newest first so today's number is always fresh. A few days at a time,
  // and stop starting new ones near the function's time limit.
  const started = Date.now();
  const queue = due.reverse().slice(0, budget);
  let done = 0;
  const worker = async () => {
    while (queue.length && Date.now() - started < 40_000) {
      const key = queue.shift()!;
      const d = await fetchVercelDay(key);
      await sql`
        insert into opex_vercel_days (day, billed_usd, site_usd, team_usd, other_usd, fetched_at)
        values (${key}, ${d.total}, ${d.site}, ${d.team}, ${d.other}, now())
        on conflict (day) do update set billed_usd = excluded.billed_usd, site_usd = excluded.site_usd,
          team_usd = excluded.team_usd, other_usd = excluded.other_usd, fetched_at = now()
      `;
      done++;
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return done;
}

export async function cacheGet(key: string): Promise<{ value: unknown; fetchedAt: Date } | null> {
  const { rows } = await sql`select value, fetched_at from opex_cache where key = ${key}`;
  return rows[0] ? { value: rows[0].value, fetchedAt: new Date(rows[0].fetched_at as string) } : null;
}

export async function cacheSet(key: string, value: unknown) {
  await sql`
    insert into opex_cache (key, value, fetched_at) values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, fetched_at = now()
  `;
}

/** A finished month needs one fetch after it ends; the current month every few hours. */
function stale(entry: { fetchedAt: Date } | null, m: Month, now: Date, force: boolean) {
  if (!entry) return true;
  if (entry.fetchedAt.getTime() > m.end.getTime() + 2 * 86_400_000) return false;
  return force || now.getTime() - entry.fetchedAt.getTime() > 3 * 3_600_000;
}

async function refreshAnthropic(m: Month, now: Date, force: boolean) {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) return;
  const key = `anthropic:${m.key}`;
  if (!stale(await cacheGet(key), m, now, force)) return;
  let cents = 0;
  let page: string | null = null;
  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams({ starting_at: m.start.toISOString().replace(".000", ""), ending_at: m.end.toISOString().replace(".000", ""), bucket_width: "1d", limit: "31" });
    if (page) params.set("page", page);
    const res = await fetch(`${ANTHROPIC_API}/v1/organizations/cost_report?${params}`, {
      headers: { "x-api-key": adminKey, "anthropic-version": "2026-10-21" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Anthropic cost report ${res.status}`);
    const body = (await res.json()) as { data?: { results?: { amount?: string }[] }[]; has_more?: boolean; next_page?: string | null };
    for (const bucket of body.data ?? []) for (const r of bucket.results ?? []) cents += Number(r.amount) || 0;
    if (!body.has_more || !body.next_page) break;
    page = body.next_page;
  }
  await cacheSet(key, { cents });
}

/** Pulls fresh numbers. Each source fails on its own without stopping the rest. */
export async function refreshOpex({ force = false, vercelDays = 12 } = {}) {
  if (!USE_DB) return { ok: true, skipped: "No database." };
  await ensureSchema();
  const now = new Date();
  const errors: string[] = [];
  const failed: Record<string, string> = {};
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed";
      errors.push(`${name}: ${message}`);
      failed[name] = message;
    }
  };
  let vercel = 0;
  await run("Vercel", async () => {
    vercel = await refreshVercel(now, vercelDays);
  });
  for (const m of await refreshMonths(now)) {
    await run("Anthropic", () => refreshAnthropic(m, now, force));
  }
  await cacheSet("updated_at", now.toISOString());
  await cacheSet("failed_sources", failed);
  if (errors.length) console.error("Operating costs refresh:", errors.join("; "));
  return { ok: errors.length === 0, vercelDays: vercel, errors };
}

// ---------------------------------------------------------------------------
// Year to date: from January, or from the month the site started if later
// (read from when Vercel created the project).
// ---------------------------------------------------------------------------

async function recordSiteStart() {
  if ((await cacheGet("site_started"))?.value) return;
  const res = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return;
  const body = (await res.json()) as { createdAt?: number };
  if (body.createdAt) await cacheSet("site_started", new Date(body.createdAt).toISOString());
}

/** The months year-to-date covers, oldest first. */
async function yearMonths(now = new Date()): Promise<Month[]> {
  // The start date set in the card wins; otherwise when Vercel created the project.
  const set = (await cacheGet("costs_start"))?.value;
  const started = typeof set === "string" ? `${set}T00:00:00Z` : (await cacheGet("site_started"))?.value;
  const startedAt = typeof started === "string" ? Date.parse(started) : NaN;
  const jan = Date.UTC(now.getUTCFullYear(), 0, 1);
  const from = Number.isFinite(startedAt) && startedAt > jan ? startedAt : jan;
  const out: Month[] = [];
  for (let offset = 0; offset > -12; offset--) {
    const m = monthOf(offset, now);
    if (m.end.getTime() <= from) break;
    out.unshift(m);
  }
  return out;
}

export async function getCostsStart(): Promise<string | null> {
  const v = (await cacheGet("costs_start"))?.value;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Sets the day costs start counting; null goes back to the site's launch date. */
export async function saveCostsStart(input: unknown): Promise<{ ok: boolean; error?: string }> {
  if (input === undefined) return { ok: true };
  await ensureSchema();
  if (input === null || input === "") {
    await sql`delete from opex_cache where key = 'costs_start'`;
    return { ok: true };
  }
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input) || !Number.isFinite(Date.parse(input))) return { ok: false, error: "Check the start date." };
  if (Date.parse(input) > Date.now()) return { ok: false, error: "The start date can't be in the future." };
  await cacheSet("costs_start", input);
  return { ok: true };
}

/** Year to date plus last month (which is last year's in January). */
async function refreshMonths(now = new Date()): Promise<Month[]> {
  const months = await yearMonths(now);
  const last = monthOf(-1, now);
  if (!months.some((m) => m.key === last.key)) months.unshift(last);
  return months;
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

async function monthLines(m: Month, fixed: FixedCost[], partial: boolean): Promise<OpexMonth> {
  const lines: OpexLine[] = [];
  const s = day(m.start);
  const e = day(m.end);

  // Vercel hosting: this site's own usage, plus its share of the team-wide
  // costs (plan, seats, untagged usage) split across the team's projects.
  const { rows: v } = await sql`
    select coalesce(sum(site_usd), 0)::float as site, coalesce(sum(team_usd), 0)::float as team,
           coalesce(sum(billed_usd), 0)::float as total, count(*)::int as days
    from opex_vercel_days where day >= ${s} and day < ${e}
  `;
  const vercelDays = Number(v[0]?.days ?? 0);
  const projects = Math.max(1, Number((await cacheGet("vercel_projects"))?.value) || 1);
  const siteUsd = Number(v[0]?.site ?? 0);
  const teamShare = Number(v[0]?.team ?? 0) / projects;
  // Days the month should have so far: all of a past month, up to today for this one.
  const expectedDays = Math.round((Math.min(m.end.getTime(), Date.parse(`${day(new Date())}T00:00:00Z`) + 86_400_000) - m.start.getTime()) / 86_400_000);
  const filling = vercelDays < expectedDays ? ` · ${vercelDays} of ${expectedDays} days so far` : "";
  lines.push({
    key: "vercel",
    label: "Vercel hosting",
    detail:
      !process.env.VERCEL_API_TOKEN && !vercelDays
        ? "Not connected yet"
        : vercelDays
          ? `The Market ${money(siteUsd)} + team plan & shared ${money(Number(v[0]?.team ?? 0))} ÷ ${projects} projects${filling}`
          : "Waiting for first update",
    usd: vercelDays ? siteUsd + teamShare : null,
    how: "auto",
  });

  // Anthropic: the exact bill if there's an admin key, else priced from each call.
  const exact = (await cacheGet(`anthropic:${m.key}`))?.value as { cents?: number } | undefined;
  const { rows: c } = await sql`select coalesce(sum(qty), 0)::int as n, coalesce(sum(cost_usd), 0)::float as usd from opex_usage where kind = 'claude' and created_at >= ${m.start.toISOString()} and created_at < ${m.end.toISOString()}`;
  const checks = Number(c[0]?.n ?? 0);
  lines.push(
    exact && process.env.ANTHROPIC_ADMIN_KEY
      ? { key: "anthropic", label: "Anthropic (Claude)", detail: `Billed · ${checks} photo check${checks === 1 ? "" : "s"}`, usd: (exact.cents ?? 0) / 100, how: "auto" }
      : { key: "anthropic", label: "Anthropic (Claude)", detail: `${checks} photo check${checks === 1 ? "" : "s"}, priced per check`, usd: Number(c[0]?.usd ?? 0), how: "estimate" },
  );

  // Emails: the plan is a fixed cost; this shows how much it's used.
  const { rows: em } = await sql`select coalesce(sum(qty), 0)::int as n from opex_usage where kind = 'email' and created_at >= ${m.start.toISOString()} and created_at < ${m.end.toISOString()}`;
  const emails = Number(em[0]?.n ?? 0);

  // Photo storage, worked out from what's stored (photos plus their smaller copies).
  let gb = 0;
  try {
    const { rows: ph } = await sql`select coalesce(sum(full_bytes), 0)::float as bytes from photo_items where uploaded`;
    gb = (Number(ph[0]?.bytes ?? 0) * 1.25) / 1e9;
  } catch {
    gb = 0;
  }
  lines.push({
    key: "r2",
    label: "Photo storage (Cloudflare)",
    detail: `${gb.toFixed(1)} GB stored${gb <= R2_FREE_GB ? ", inside the free 10 GB" : ""}`,
    usd: Math.max(0, gb - R2_FREE_GB) * R2_PER_GB,
    how: "estimate",
  });

  for (const f of fixed) {
    const usd = fixedMonthly(f);
    const detail =
      f.per === "user"
        ? `${f.users} ${f.users === 1 ? "person" : "people"} × ${money(f.amountCents / 100)}`
        : f.per === "year"
          ? `${money(f.amountCents / 100)} a year`
          : "Monthly";
    const shared = f.split > 1 ? ` ÷ ${f.split} apps` : "";
    lines.push({
      key: `fixed:${f.id}`,
      label: f.name,
      detail: f.amountCents ? (/resend/i.test(f.name) ? `${detail}${shared} · ${emails} sent` : `${detail}${shared}`) : "Add the price",
      usd: f.amountCents ? usd : null,
      how: "fixed",
    });
  }
  if (!fixed.some((f) => /resend|email/i.test(f.name))) {
    lines.push({ key: "emails", label: "Emails (Resend)", detail: `${emails} sent`, usd: null, how: "estimate" });
  }

  let tickets = 0;
  try {
    const { rows: t } = await sql`
      select count(*)::int as n from ticketing_tickets t join ticketing_orders o on o.id = t.order_id
      where o.paid_at >= ${m.start.toISOString()} and o.paid_at < ${m.end.toISOString()}
    `;
    tickets = Number(t[0]?.n ?? 0);
  } catch {
    tickets = 0;
  }

  return {
    key: m.key,
    label: partial ? `${m.label} so far` : m.label,
    lines,
    total: lines.reduce((n, l) => n + (l.usd ?? 0), 0),
    tickets,
  };
}

// ---------------------------------------------------------------------------
// Self-check: are the automatic numbers fresh and complete?
// ---------------------------------------------------------------------------

const daysIn = (m: Month) => Math.round((m.end.getTime() - m.start.getTime()) / 86_400_000);

export async function opexIssues(now = new Date()): Promise<string[]> {
  if (!USE_DB) return [];
  await ensureSchema();
  const issues: string[] = [];
  const updated = (await cacheGet("updated_at"))?.value;
  const updatedAt = typeof updated === "string" ? Date.parse(updated) : NaN;

  // 1. The refresh runs every 6 hours; 13 hours without one means it stopped.
  if (!Number.isFinite(updatedAt)) issues.push("The costs have never updated. Press Refresh.");
  else if (now.getTime() - updatedAt > 13 * 3_600_000) issues.push(`The costs haven't updated since ${new Date(updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" })}.`);

  // 2. A service that refused or failed on the last refresh.
  const failed = ((await cacheGet("failed_sources"))?.value ?? {}) as Record<string, string>;
  for (const [name, message] of Object.entries(failed)) issues.push(`Couldn't get ${name}'s numbers (${message}).`);

  // 3. Every day of Vercel's bill is in: all of last month, and this month up to yesterday.
  if (process.env.VERCEL_API_TOKEN) {
    const last = monthOf(-1, now);
    const thisMonth = monthOf(0, now);
    const { rows } = await sql`
      select count(*) filter (where day >= ${day(last.start)} and day < ${day(last.end)})::int as last_days,
             count(*) filter (where day >= ${day(thisMonth.start)} and day < ${day(now)})::int as this_days
      from opex_vercel_days
    `;
    const lastDays = Number(rows[0]?.last_days ?? 0);
    const thisDays = Number(rows[0]?.this_days ?? 0);
    const thisExpected = Math.round((Date.parse(`${day(now)}T00:00:00Z`) - thisMonth.start.getTime()) / 86_400_000);
    if (lastDays < daysIn(last)) issues.push(`Vercel hosting for ${last.label} has ${lastDays} of ${daysIn(last)} days so far.`);
    if (thisDays < thisExpected) issues.push(`Vercel hosting for ${thisMonth.label} is missing ${thisExpected - thisDays} day${thisExpected - thisDays === 1 ? "" : "s"}.`);
  }
  return issues;
}

/** Adds months together line by line (same keys, same order). */
function sumMonths(months: OpexMonth[], range: Month[]): OpexMonth {
  const now = new Date();
  const first = range[0] ?? monthOf(0, now);
  const short = (m: Month) => m.start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const span = range.length > 1 ? `${short(first)}–${short(range[range.length - 1])}` : short(first);
  const byKey = new Map<string, OpexLine & { n: number }>();
  for (const month of months) {
    for (const l of month.lines) {
      const prev = byKey.get(l.key);
      if (!prev) byKey.set(l.key, { ...l, n: l.usd === null ? 0 : 1 });
      else {
        prev.usd = prev.usd === null && l.usd === null ? null : (prev.usd ?? 0) + (l.usd ?? 0);
        if (l.usd !== null) prev.n++;
        prev.how = prev.how === "estimate" || l.how === "estimate" ? "estimate" : prev.how;
      }
    }
  }
  const lines = [...byKey.values()].map(({ n, ...l }) => ({
    ...l,
    detail: l.usd === null ? l.detail : `${span} · ${n} month${n === 1 ? "" : "s"}`,
  }));
  return {
    key: `ytd-${now.getUTCFullYear()}`,
    label: `${now.getUTCFullYear()} so far`,
    lines,
    total: lines.reduce((t, l) => t + (l.usd ?? 0), 0),
    tickets: months.reduce((t, m) => t + m.tickets, 0),
  };
}

export async function getOpexSummary(): Promise<OpexSummary | null> {
  if (!USE_DB) return null;
  try {
    await ensureSchema();
    const fixed = await listFixedCosts();
    const [thisMonth, lastMonth] = await Promise.all([monthLines(monthOf(0), fixed, true), monthLines(monthOf(-1), fixed, false)]);
    const year = await yearMonths();
    const months = await Promise.all(
      year.map((m) => (m.key === thisMonth.key ? thisMonth : m.key === lastMonth.key ? lastMonth : monthLines(m, fixed, false))),
    );
    const ytd = sumMonths(months, year);
    const updated = (await cacheGet("updated_at"))?.value;
    return {
      thisMonth,
      lastMonth,
      ytd,
      fixed,
      updatedAt: typeof updated === "string" ? updated : null,
      vercelConnected: Boolean(process.env.VERCEL_API_TOKEN),
      anthropicExact: Boolean(process.env.ANTHROPIC_ADMIN_KEY),
      issues: await opexIssues(),
      costsStart: await getCostsStart(),
    };
  } catch (error) {
    console.error("Operating costs summary failed", error);
    return null;
  }
}
