import { readLocalRecords, updateLocalRecords, isWithinDays } from "./localRecords";
type LocalClick = { target: MenuClickTarget; source: string; createdAt: string };
import { venue } from "./venue";
import { sql } from "@vercel/postgres";

const USE_DB = !venue.localPreview && Boolean(process.env.POSTGRES_URL);

export const MENU_CLICK_TARGETS = [
  "menu",
  "calendar",
  "private-events",
  "reservations",
  "story",
  "visit",
  "contact",
  "careers",
  "home",
] as const;

export type MenuClickTarget = (typeof MENU_CLICK_TARGETS)[number];

export function isMenuClickTarget(value: unknown): value is MenuClickTarget {
  return typeof value === "string" && (MENU_CLICK_TARGETS as readonly string[]).includes(value);
}

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS menu_clicks (
        id SERIAL PRIMARY KEY,
        target TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'bottom',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

export async function recordMenuClick(target: MenuClickTarget, source: string) {
  if (venue.localPreview) { await updateLocalRecords<LocalClick, void>("menu-clicks", rows => { rows.push({ target, source, createdAt: new Date().toISOString() }); }); return; }

  if (!USE_DB) return;
  await ensureSchema();
  await sql`
    INSERT INTO menu_clicks (target, source)
    VALUES (${target}, ${source})
  `;
}

export type MenuClickStats = {
  totals: Record<MenuClickTarget, number>;
  last30: Record<MenuClickTarget, number>;
  overallTotal: number;
  overallLast30: number;
};

export async function getMenuClickStats(): Promise<MenuClickStats> {
  const emptyRecord = () =>
    MENU_CLICK_TARGETS.reduce<Record<MenuClickTarget, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<MenuClickTarget, number>);

  const totals = emptyRecord();
  const last30 = emptyRecord();

  if (venue.localPreview) {
    const rows = await readLocalRecords<LocalClick>("menu-clicks");
    for (const row of rows) { if (isMenuClickTarget(row.target)) { totals[row.target]++; if (isWithinDays(row.createdAt,30)) last30[row.target]++; } }
    return { totals, last30, overallTotal: rows.length, overallLast30: rows.filter(r => isWithinDays(r.createdAt,30)).length };
  }
  if (!USE_DB) {
    return { totals, last30, overallTotal: 0, overallLast30: 0 };
  }

  await ensureSchema();
  const { rows } = await sql`
    SELECT
      target,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30
    FROM menu_clicks
    GROUP BY target
  `;

  let overallTotal = 0;
  let overallLast30 = 0;
  for (const row of rows) {
    const target = row.target as string;
    const total = (row.total as number) ?? 0;
    const last30Count = (row.last_30 as number) ?? 0;
    overallTotal += total;
    overallLast30 += last30Count;
    if (isMenuClickTarget(target)) {
      totals[target] = total;
      last30[target] = last30Count;
    }
  }

  return { totals, last30, overallTotal, overallLast30 };
}
