import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import type { SiteContent } from "./siteContentSchema";

const USE_DB = Boolean(process.env.POSTGRES_URL);
const CONTENT_DIR = path.join(process.cwd(), "content");

export type ContentKey = "published" | "draft";

const SEED_PATHS: Record<ContentKey, string> = {
  published: path.join(CONTENT_DIR, "published-site.json"),
  draft: path.join(CONTENT_DIR, "draft-site.json"),
};

let schemaReady: Promise<void> | null = null;

function readSeed(key: ContentKey): SiteContent {
  return JSON.parse(readFileSync(SEED_PATHS[key], "utf8")) as SiteContent;
}

const DEFAULT_PRIVATE_EVENTS_EMBED =
  '<iframe src="https://tipsyapp.io/embed/bar-phoebe" title="Private event request form" style="width:100%;border:0;height:760px" scrolling="no"></iframe>';

function normalizeContent(content: SiteContent): SiteContent {
  if (content.contact && typeof content.contact.instagramLabel !== "string") {
    content.contact.instagramLabel = "";
  }
  if (content.privateEvents && typeof content.privateEvents.embedCode !== "string") {
    content.privateEvents.embedCode = DEFAULT_PRIVATE_EVENTS_EMBED;
  }
  if (!content.careers || typeof content.careers !== "object") {
    content.careers = { title: "Join the Bar Phoebe Team", embedCode: "" };
  } else {
    if (typeof content.careers.title !== "string") content.careers.title = "Join the Bar Phoebe Team";
    if (typeof content.careers.embedCode !== "string") content.careers.embedCode = "";
  }
  if (!content.reservations || typeof content.reservations !== "object") {
    content.reservations = { title: "Reserve at Bar Phoebe", embedCode: "" };
  } else {
    if (typeof content.reservations.title !== "string") content.reservations.title = "Reserve at Bar Phoebe";
    if (typeof content.reservations.embedCode !== "string") content.reservations.embedCode = "";
  }
  return content;
}

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS site_content (
        id TEXT PRIMARY KEY,
        content JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return schemaReady;
}

async function readDb(key: ContentKey): Promise<SiteContent> {
  await ensureSchema();
  const { rows } = await sql`SELECT content FROM site_content WHERE id = ${key} LIMIT 1`;
  if (rows[0]) return normalizeContent(rows[0].content as SiteContent);

  const seed = readSeed(key);
  await sql`
    INSERT INTO site_content (id, content)
    VALUES (${key}, ${JSON.stringify(seed)}::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;
  return normalizeContent(seed);
}

async function writeDb(key: ContentKey, content: SiteContent) {
  await ensureSchema();
  await sql`
    INSERT INTO site_content (id, content, updated_at)
    VALUES (${key}, ${JSON.stringify(content)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;
}

export async function readSiteContent(key: ContentKey): Promise<SiteContent> {
  if (USE_DB) return readDb(key);
  return normalizeContent(readSeed(key));
}

export async function writeSiteContent(key: ContentKey, content: SiteContent) {
  if (USE_DB) {
    await writeDb(key, content);
    return;
  }
  writeFileSync(SEED_PATHS[key], `${JSON.stringify(content, null, 2)}\n`);
}

export async function copySiteContent(from: ContentKey, to: ContentKey) {
  if (USE_DB) {
    const content = await readSiteContent(from);
    await writeSiteContent(to, content);
    return;
  }
  copyFileSync(SEED_PATHS[from], SEED_PATHS[to]);
}
