import { sql } from "@vercel/postgres";

const USE_DB = Boolean(process.env.POSTGRES_URL);

export type BlackbookStatus = "vip" | "banned";

export type BlackbookEntry = {
  id: number;
  name: string;
  photoUrl: string;
  notes: string;
  status: BlackbookStatus;
  createdAt: string;
  updatedAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS blackbook_entries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        photo_url TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'vip',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

export function isBlackbookStatus(value: unknown): value is BlackbookStatus {
  return value === "vip" || value === "banned";
}

function rowToEntry(row: Record<string, unknown>): BlackbookEntry {
  return {
    id: row.id as number,
    name: (row.name as string) ?? "",
    photoUrl: (row.photo_url as string) ?? "",
    notes: (row.notes as string) ?? "",
    status: (row.status as BlackbookStatus) ?? "vip",
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export type BlackbookStats = {
  total: number;
  vip: number;
  banned: number;
};

export async function getBlackbookStats(): Promise<BlackbookStats> {
  if (!USE_DB) return { total: 0, vip: 0, banned: 0 };
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'vip')::int AS vip,
      COUNT(*) FILTER (WHERE status = 'banned')::int AS banned
    FROM blackbook_entries
  `;
  const row = rows[0] ?? {};
  return {
    total: (row.total as number) ?? 0,
    vip: (row.vip as number) ?? 0,
    banned: (row.banned as number) ?? 0,
  };
}

export async function listBlackbookEntries(): Promise<BlackbookEntry[]> {
  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, name, photo_url, notes, status, created_at, updated_at
    FROM blackbook_entries
    ORDER BY name ASC
  `;
  return rows.map(rowToEntry);
}

export async function createBlackbookEntry(input: {
  name: string;
  photoUrl: string;
  notes: string;
  status: BlackbookStatus;
}): Promise<BlackbookEntry | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO blackbook_entries (name, photo_url, notes, status)
    VALUES (${input.name}, ${input.photoUrl}, ${input.notes}, ${input.status})
    RETURNING id, name, photo_url, notes, status, created_at, updated_at
  `;
  return rows[0] ? rowToEntry(rows[0]) : null;
}

export async function updateBlackbookEntry(
  id: number,
  input: { name: string; photoUrl: string; notes: string; status: BlackbookStatus },
): Promise<BlackbookEntry | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    UPDATE blackbook_entries
    SET name = ${input.name},
        photo_url = ${input.photoUrl},
        notes = ${input.notes},
        status = ${input.status},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name, photo_url, notes, status, created_at, updated_at
  `;
  return rows[0] ? rowToEntry(rows[0]) : null;
}

export async function deleteBlackbookEntry(id: number) {
  if (!USE_DB) return;
  await ensureSchema();
  await sql`DELETE FROM blackbook_entries WHERE id = ${id}`;
}
