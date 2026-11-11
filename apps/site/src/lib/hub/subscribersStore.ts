import { sql } from "@vercel/postgres";

const USE_DB = Boolean(process.env.POSTGRES_URL);

export type SubscriberSource = "newsletter" | "contact_form";

export type Subscriber = {
  id: number;
  email: string;
  source: SubscriberSource;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT 'newsletter',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

export async function addSubscriber(email: string, source: SubscriberSource) {
  if (!USE_DB) return { added: false as const };
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const { rowCount } = await sql`
    INSERT INTO newsletter_subscribers (email, source)
    VALUES (${normalized}, ${source})
    ON CONFLICT (email) DO NOTHING
  `;
  return { added: (rowCount ?? 0) > 0 };
}

export type SubscriberStats = {
  total: number;
  fromNewsletter: number;
  fromContactForm: number;
  last30Days: number;
};

export async function getSubscriberStats(): Promise<SubscriberStats> {
  if (!USE_DB) return { total: 0, fromNewsletter: 0, fromContactForm: 0, last30Days: 0 };
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE source = 'newsletter')::int AS from_newsletter,
      COUNT(*) FILTER (WHERE source = 'contact_form')::int AS from_contact,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30
    FROM newsletter_subscribers
  `;
  const row = rows[0] ?? {};
  return {
    total: (row.total as number) ?? 0,
    fromNewsletter: (row.from_newsletter as number) ?? 0,
    fromContactForm: (row.from_contact as number) ?? 0,
    last30Days: (row.last_30 as number) ?? 0,
  };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, email, source, created_at
    FROM newsletter_subscribers
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    id: row.id as number,
    email: row.email as string,
    source: row.source as SubscriberSource,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}
