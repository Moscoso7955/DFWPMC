import { readLocalRecords, updateLocalRecords, isWithinDays } from "./localRecords";
import { venue } from "./venue";
import { sql } from "@vercel/postgres";

const USE_DB = !venue.localPreview && Boolean(process.env.POSTGRES_URL);

export type ContactSubmission = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        ALTER TABLE contact_submissions
        ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''
      `;
    })();
  }
  return schemaReady;
}

export async function insertContactSubmission(name: string, email: string, message: string) {
  if (venue.localPreview) {
    await updateLocalRecords<ContactSubmission, void>("contacts", rows => {
      rows.push({ id: Math.max(0, ...rows.map(r => r.id)) + 1, name, email, message, createdAt: new Date().toISOString() });
    });
    return;
  }

  if (!USE_DB) return;
  await ensureSchema();
  await sql`
    INSERT INTO contact_submissions (name, email, message)
    VALUES (${name}, ${email}, ${message})
  `;
}

export type ContactSubmissionStats = {
  total: number;
  last7Days: number;
  last30Days: number;
  mostRecent: string | null;
};

export async function getContactSubmissionStats(): Promise<ContactSubmissionStats> {
  if (venue.localPreview) {
    const rows = await readLocalRecords<ContactSubmission>("contacts");
    return { total: rows.length, last7Days: rows.filter(r => isWithinDays(r.createdAt,7)).length, last30Days: rows.filter(r => isWithinDays(r.createdAt,30)).length, mostRecent: rows.map(r => r.createdAt).sort().at(-1) ?? null };
  }

  if (!USE_DB) return { total: 0, last7Days: 0, last30Days: 0, mostRecent: null };
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30,
      MAX(created_at) AS most_recent
    FROM contact_submissions
  `;
  const row = rows[0] ?? {};
  return {
    total: (row.total as number) ?? 0,
    last7Days: (row.last_7 as number) ?? 0,
    last30Days: (row.last_30 as number) ?? 0,
    mostRecent: row.most_recent ? (row.most_recent as Date).toISOString() : null,
  };
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  if (venue.localPreview) return (await readLocalRecords<ContactSubmission>("contacts")).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,200);

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, name, email, message, created_at
    FROM contact_submissions
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return rows.map((row) => ({
    id: row.id as number,
    name: (row.name as string) ?? "",
    email: row.email as string,
    message: row.message as string,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}
