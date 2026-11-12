import { sql } from "@vercel/postgres";

// Guest page views: one row each time a public page is opened, so
// Analytics can show which pages (and which events and photo nights)
// people actually look at. Admin, ticketing, door, upload and private
// ticket pages are never counted.

const USE_DB = Boolean(process.env.POSTGRES_URL);

const SIMPLE = new Set([
  "/",
  "/menu",
  "/calendar",
  "/visit",
  "/story",
  "/contact",
  "/careers",
  "/private-events",
  "/reservations",
  "/contest",
  "/contest/vote",
  "/dm",
  "/privacy",
  "/terms",
  "/accessibility",
]);

/** A public path to the page key it's counted under, or null if it isn't counted. */
export function pageKey(rawPath: unknown): string | null {
  if (typeof rawPath !== "string" || rawPath.length > 200) return null;
  const path = rawPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (SIMPLE.has(path)) return path;
  // A venue's home page or one of its simple pages.
  for (const venue of ["/willow", "/madrone", "/publicmarketcafe"]) {
    if (path === venue) return path;
    if (path.startsWith(`${venue}/`) && SIMPLE.has(path.slice(venue.length))) return path;
  }
  // A Market Nights page, or a photo event under it.
  const photos = /^\/photos\/(\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]{1,80})?)$/.exec(path);
  if (photos) return `/photos/${photos[1]}`;
  return null;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        create table if not exists page_views (
          id bigserial primary key,
          page text not null,
          created_at timestamptz not null default now()
        )
      `;
      await sql`create index if not exists page_views_page_idx on page_views (page, created_at)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function recordPageView(page: string) {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`insert into page_views (page) values (${page})`;
}

export type PageViewRow = { page: string; total: number; last30: number };
export type PageViewStats = { rows: PageViewRow[]; total: number; last30: number; since: string | null };

export async function getPageViewStats(): Promise<PageViewStats> {
  if (!USE_DB) return { rows: [], total: 0, last30: 0, since: null };
  try {
    await ensureSchema();
    const { rows } = await sql`
      select page,
        count(*)::int as total,
        count(*) filter (where created_at >= now() - interval '30 days')::int as last30,
        min(created_at) as since
      from page_views
      group by page
      order by last30 desc, total desc
    `;
    const out = rows.map((r) => ({ page: String(r.page), total: Number(r.total), last30: Number(r.last30) }));
    const since = rows.reduce<string | null>((min, r) => {
      const t = r.since ? new Date(r.since as string).toISOString() : null;
      return t && (!min || t < min) ? t : min;
    }, null);
    return {
      rows: out,
      total: out.reduce((n, r) => n + r.total, 0),
      last30: out.reduce((n, r) => n + r.last30, 0),
      since,
    };
  } catch {
    return { rows: [], total: 0, last30: 0, since: null };
  }
}
