import { previewGuests } from "./previewData";
import { sql } from "@vercel/postgres";

const USE_DB = Boolean(process.env.POSTGRES_URL);

/** The Blackbook is real as soon as the collective's database exists; the
 * rest of the site's preview guards don't apply to it. */
export function isBlackbookConnected() {
  return USE_DB;
}

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
    `.then(async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS blackbook_photos (
          id SERIAL PRIMARY KEY,
          content_type TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    });
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
  if (!USE_DB) return { total: previewGuests().length, vip: previewGuests().filter(r => r.status === "vip").length, banned: previewGuests().filter(r => r.status === "banned").length };
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
  if (!USE_DB) return previewGuests();
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

export async function updateBlackbookEntry(id: number,
  input: { name: string; photoUrl: string; notes: string; status: BlackbookStatus },
): Promise<BlackbookEntry | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows: existing } = await sql`SELECT photo_url FROM blackbook_entries WHERE id = ${id} LIMIT 1`;
  const previousPhotoUrl = (existing[0]?.photo_url as string | undefined) ?? null;
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
  if (rows[0] && previousPhotoUrl && previousPhotoUrl !== input.photoUrl) {
    await deletePhotoIfOurs(previousPhotoUrl);
  }
  return rows[0] ? rowToEntry(rows[0]) : null;
}

export async function deleteBlackbookEntry(id: number) {
  if (!USE_DB) return;
  await ensureSchema();
  const { rows } = await sql`DELETE FROM blackbook_entries WHERE id = ${id} RETURNING photo_url`;
  await deletePhotoIfOurs((rows[0]?.photo_url as string | undefined) ?? null);
}

const PHOTO_URL_PATTERN = /^\/blackbook\/api\/photo\/(\d+)$/;

function photoIdFromUrl(url: string): number | null {
  const match = PHOTO_URL_PATTERN.exec(url);
  return match ? Number(match[1]) : null;
}

/** Guest photos are sensitive, so the bytes live in the database and are
 * only served through /blackbook/api/photo/[id], which checks the
 * Blackbook session. Stored base64 to ride the SQL driver's text params. */
export async function saveBlackbookPhoto(contentType: string, bytes: Buffer): Promise<string | null> {
  if (!USE_DB) return null;
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO blackbook_photos (content_type, data)
    VALUES (${contentType}, ${bytes.toString("base64")})
    RETURNING id
  `;
  return rows[0] ? `/blackbook/api/photo/${rows[0].id as number}` : null;
}

export async function readBlackbookPhoto(id: number): Promise<{ contentType: string; bytes: Buffer } | null> {
  if (!USE_DB || !Number.isFinite(id)) return null;
  await ensureSchema();
  const { rows } = await sql`SELECT content_type, data FROM blackbook_photos WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return { contentType: rows[0].content_type as string, bytes: Buffer.from(rows[0].data as string, "base64") };
}

async function deletePhotoIfOurs(photoUrl: string | null | undefined) {
  const id = photoUrl ? photoIdFromUrl(photoUrl) : null;
  if (id === null) return;
  const { rows } = await sql`SELECT COUNT(*)::int AS refs FROM blackbook_entries WHERE photo_url = ${photoUrl as string}`;
  if (((rows[0]?.refs as number) ?? 0) === 0) {
    await sql`DELETE FROM blackbook_photos WHERE id = ${id}`;
  }
}

export { deletePhotoIfOurs as cleanUpBlackbookPhoto };
