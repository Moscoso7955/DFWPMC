import { readLocalRecords, updateLocalRecords, isWithinDays } from "./localRecords";
import { venue } from "./venue";
import { sql } from "@vercel/postgres";

const USE_DB = !venue.localPreview && Boolean(process.env.POSTGRES_URL);

export type SubscriberSource = "newsletter" | "contact_form" | "ticket_purchase";

export type Subscriber = {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: SubscriberSource;
  createdAt: string;
};

// Shape served to the CallidusCo mailing app's sync pull. Rows are never
// deleted — an unsubscribe sets unsubscribedAt, and the feed includes
// those rows so the mailing app honors removals made here.
export type SyncSubscriber = Subscriber & {
  updatedAt: string;
  unsubscribedAt: string | null;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          source TEXT NOT NULL DEFAULT 'newsletter',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      // Sync + compliance columns (see docs/mailing-list-sync.md).
      await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;
      await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT`;
      await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`;
      await sql`CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_updated_at ON newsletter_subscribers (updated_at)`;
      // One-time backfill: fill in names for existing subscribers whose
      // name is blank by pulling the most recent contact_submissions row
      // matching the same email. Case-insensitive match on both sides
      // so a mixed-case historical row still lines up. Wrapped in a
      // try/catch — if contact_submissions doesn't exist yet (fresh
      // deploy against an empty DB), the backfill is a no-op rather
      // than blocking schema init.
      try {
        await sql`
          UPDATE newsletter_subscribers ns
          SET name = cs.name, updated_at = NOW()
          FROM (
            SELECT DISTINCT ON (LOWER(email)) LOWER(email) AS email, name
            FROM contact_submissions
            WHERE name <> ''
            ORDER BY LOWER(email), created_at DESC
          ) cs
          WHERE ns.name = '' AND LOWER(ns.email) = cs.email
        `;
      } catch {
        // ignore — either contact_submissions doesn't exist yet, or
        // the backfill isn't applicable in this environment.
      }
    })();
  }
  return schemaReady;
}

export async function addSubscriber(
  email: string,
  source: SubscriberSource,
  name?: string,
  phone?: string,
) {
  if (venue.localPreview) {
    return updateLocalRecords<SyncSubscriber, { added: boolean }>("subscribers", rows => {
      const normalized = email.trim().toLowerCase(), now = new Date().toISOString();
      const existing = rows.find(r => r.email === normalized);
      let added = !existing;
      if (existing) {
        added = Boolean(existing.unsubscribedAt || (!existing.name && name?.trim()) || (!existing.phone && phone?.trim()));
        if (added) { existing.unsubscribedAt = null; existing.updatedAt = now; existing.name ||= name?.trim() ?? ""; existing.phone ||= phone?.trim() ?? ""; }
      } else rows.push({ id: Math.max(0, ...rows.map(r => r.id)) + 1, email: normalized, name: name?.trim() ?? "", phone: phone?.trim() ?? "", source, createdAt: now, updatedAt: now, unsubscribedAt: null });
      return { added };
    });
  }

  if (!USE_DB) return { added: false as const };
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const cleanName = (name ?? "").trim();
  const cleanPhone = (phone ?? "").trim();
  // A fresh signup from someone who previously unsubscribed is new
  // consent: clear the unsubscribe and bump updated_at so the next
  // incremental sync sees it. Preserve any existing name/phone unless
  // the row has none yet, in which case fill it in from this signup.
  const { rowCount } = await sql`
    INSERT INTO newsletter_subscribers (email, source, name, phone)
    VALUES (${normalized}, ${source}, ${cleanName}, ${cleanPhone})
    ON CONFLICT (email) DO UPDATE
      SET
        unsubscribed_at = NULL,
        unsubscribe_reason = NULL,
        name = CASE
          WHEN newsletter_subscribers.name = '' AND EXCLUDED.name <> '' THEN EXCLUDED.name
          ELSE newsletter_subscribers.name
        END,
        phone = CASE
          WHEN newsletter_subscribers.phone = '' AND EXCLUDED.phone <> '' THEN EXCLUDED.phone
          ELSE newsletter_subscribers.phone
        END,
        updated_at = NOW()
      WHERE
        newsletter_subscribers.unsubscribed_at IS NOT NULL
        OR (newsletter_subscribers.name = '' AND EXCLUDED.name <> '')
        OR (newsletter_subscribers.phone = '' AND EXCLUDED.phone <> '')
  `;
  return { added: (rowCount ?? 0) > 0 };
}

export async function listSubscribersForSync(since?: string | null): Promise<SyncSubscriber[]> {
  if (venue.localPreview) return (await readLocalRecords<SyncSubscriber>("subscribers")).filter(r => !since || r.updatedAt > since).sort((a,b) => a.updatedAt.localeCompare(b.updatedAt));

  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = since
    ? await sql`
        SELECT id, name, email, phone, source, created_at, updated_at, unsubscribed_at
        FROM newsletter_subscribers
        WHERE updated_at > ${since}
        ORDER BY updated_at ASC
      `
    : await sql`
        SELECT id, name, email, phone, source, created_at, updated_at, unsubscribed_at
        FROM newsletter_subscribers
        ORDER BY updated_at ASC
      `;
  return rows.map((row) => ({
    id: row.id as number,
    name: (row.name as string) ?? "",
    email: row.email as string,
    phone: (row.phone as string) ?? "",
    source: row.source as SubscriberSource,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    unsubscribedAt: row.unsubscribed_at ? (row.unsubscribed_at as Date).toISOString() : null,
  }));
}

// Idempotent: an already-unsubscribed row keeps its original timestamp
// and reason; updated_at still bumps so incremental syncs converge.
// Rows are never deleted — this table is the compliance record.
export async function markUnsubscribed(email: string, reason: string) {
  if (venue.localPreview) return updateLocalRecords<SyncSubscriber, { ok: true }>("subscribers", rows => { const row = rows.find(r => r.email === email.trim().toLowerCase()); if (row) { row.unsubscribedAt ||= new Date().toISOString(); row.updatedAt = new Date().toISOString(); } return { ok: true }; });

  if (!USE_DB) return { ok: false as const };
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  await sql`
    UPDATE newsletter_subscribers
    SET unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
        unsubscribe_reason = COALESCE(unsubscribe_reason, ${reason}),
        updated_at = NOW()
    WHERE email = ${normalized}
  `;
  return { ok: true as const };
}

export type SubscriberStats = {
  total: number;
  fromNewsletter: number;
  fromContactForm: number;
  fromTicketPurchase: number;
  last30Days: number;
};

export async function getSubscriberStats(): Promise<SubscriberStats> {
  if (venue.localPreview) { const rows = await readLocalRecords<SyncSubscriber>("subscribers"); return { total: rows.length, fromNewsletter: rows.filter(r => r.source === "newsletter").length, fromContactForm: rows.filter(r => r.source === "contact_form").length, fromTicketPurchase: rows.filter(r => r.source === "ticket_purchase").length, last30Days: rows.filter(r => isWithinDays(r.createdAt,30)).length }; }

  if (!USE_DB)
    return { total: 0, fromNewsletter: 0, fromContactForm: 0, fromTicketPurchase: 0, last30Days: 0 };
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE source = 'newsletter')::int AS from_newsletter,
      COUNT(*) FILTER (WHERE source = 'contact_form')::int AS from_contact,
      COUNT(*) FILTER (WHERE source = 'ticket_purchase')::int AS from_tickets,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30
    FROM newsletter_subscribers
  `;
  const row = rows[0] ?? {};
  return {
    total: (row.total as number) ?? 0,
    fromNewsletter: (row.from_newsletter as number) ?? 0,
    fromContactForm: (row.from_contact as number) ?? 0,
    fromTicketPurchase: (row.from_tickets as number) ?? 0,
    last30Days: (row.last_30 as number) ?? 0,
  };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  if (venue.localPreview) return (await readLocalRecords<SyncSubscriber>("subscribers")).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (!USE_DB) return [];
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, name, email, phone, source, created_at
    FROM newsletter_subscribers
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    id: row.id as number,
    name: (row.name as string) ?? "",
    email: row.email as string,
    phone: (row.phone as string) ?? "",
    source: row.source as SubscriberSource,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}
