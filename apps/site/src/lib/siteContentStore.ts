import { hasHostedCMS, readCMSDocument, writeCMSDocument } from "./cmsStorage";
import { LOCAL_PREVIEW, type VenueConfig } from "./venues";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import { DEFAULT_OPERATING_HOURS, WEEKDAY_KEYS, type DayHours, type SiteContent } from "./siteContentSchema";

const USE_DB = !LOCAL_PREVIEW && Boolean(process.env.POSTGRES_URL);
const CONTENT_DIR = path.join(process.cwd(), "content");

export type ContentKey = "published" | "draft";

const seedPath = (venue: VenueConfig, key: ContentKey) => path.join(CONTENT_DIR, venue.slug, `${key}-site.json`);

let schemaReady: Promise<void> | null = null;

function readSeed(venue: VenueConfig, key: ContentKey): SiteContent {
  return JSON.parse(readFileSync(seedPath(venue, key), "utf8")) as SiteContent;
}

const DEFAULT_PRIVATE_EVENTS_EMBED = "";

// The collective's Tipsy loyalty join form — one link for the whole LLC.
const DEFAULT_JOIN_EMBED =
  '<iframe src="https://tipsyapp.io/embed/join/fort-worth-public-market-collective" title="Join rewards" width="100%" height="560" style="border:0;max-width:420px" loading="lazy"></iframe>';

// Tipsy's full apply page (/apply/<slug>) keeps its own padding and
// scrolls. The embed version (/apply/embed/<slug>) fills the frame and
// posts its height. Point any careers embed at the embed version.
export function toTipsyApplyEmbed(embedCode: string): string {
  return embedCode.replace(
    /(https?:\/\/(?:www\.)?tipsyapp\.io)\/apply\/(?!embed\/)([\w-]+)/g,
    "$1/apply/embed/$2",
  );
}

function normalizeContent(venue: VenueConfig, content: SiteContent): SiteContent {
  if (content.contact && typeof content.contact.instagramLabel !== "string") {
    content.contact.instagramLabel = "";
  }
  if (content.contact && typeof content.contact.joinEmbedCode !== "string") {
    content.contact.joinEmbedCode = DEFAULT_JOIN_EMBED;
  }
  if (content.privateEvents && typeof content.privateEvents.embedCode !== "string") {
    content.privateEvents.embedCode = DEFAULT_PRIVATE_EVENTS_EMBED;
  }
  if (!content.careers || typeof content.careers !== "object") {
    content.careers = { title: `Join the ${venue.name} Team`, embedCode: "" };
  } else {
    if (typeof content.careers.title !== "string") content.careers.title = `Join the ${venue.name} Team`;
    if (typeof content.careers.embedCode !== "string") content.careers.embedCode = "";
    content.careers.embedCode = toTipsyApplyEmbed(content.careers.embedCode);
  }
  if (!content.reservations || typeof content.reservations !== "object") {
    content.reservations = { title: `Reserve at ${venue.name}`, embedCode: "" };
  } else {
    if (typeof content.reservations.title !== "string") content.reservations.title = `Reserve at ${venue.name}`;
    if (typeof content.reservations.embedCode !== "string") content.reservations.embedCode = "";
  }
  if (content.calendar && !Array.isArray(content.calendar.closedDates)) {
    content.calendar.closedDates = [];
  }
  if (content.calendar && !Array.isArray(content.calendar.openDates)) {
    content.calendar.openDates = [];
  }
  if (!content.operatingHours || typeof content.operatingHours !== "object") {
    content.operatingHours = { ...DEFAULT_OPERATING_HOURS };
  } else {
    for (const key of WEEKDAY_KEYS) {
      const existing = content.operatingHours[key] as Partial<DayHours> | undefined;
      const fallback = DEFAULT_OPERATING_HOURS[key];
      content.operatingHours[key] = {
        open: typeof existing?.open === "boolean" ? existing.open : fallback.open,
        openTime: typeof existing?.openTime === "string" ? existing.openTime : fallback.openTime,
        closeTime: typeof existing?.closeTime === "string" ? existing.closeTime : fallback.closeTime,
      };
    }
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

// In Postgres mode the row id carries the venue, so the one database
// serves every skin without the venues reading each other's pages.
const dbKey = (venue: VenueConfig, key: ContentKey) => `${venue.id}:${key}`;

async function readDb(venue: VenueConfig, key: ContentKey): Promise<SiteContent> {
  await ensureSchema();
  const { rows } = await sql`SELECT content FROM site_content WHERE id = ${dbKey(venue, key)} LIMIT 1`;
  if (rows[0]) return normalizeContent(venue, rows[0].content as SiteContent);

  const seed = readSeed(venue, key);
  await sql`
    INSERT INTO site_content (id, content)
    VALUES (${dbKey(venue, key)}, ${JSON.stringify(seed)}::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;
  return normalizeContent(venue, seed);
}

async function writeDb(venue: VenueConfig, key: ContentKey, content: SiteContent) {
  await ensureSchema();
  await sql`
    INSERT INTO site_content (id, content, updated_at)
    VALUES (${dbKey(venue, key)}, ${JSON.stringify(content)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;
}

export async function readSiteContent(venue: VenueConfig, key: ContentKey): Promise<SiteContent> {
  if (hasHostedCMS(venue)) return normalizeContent(venue, (await readCMSDocument<SiteContent>(venue, key, () => readSeed(venue, key))).value);
  if (USE_DB) return readDb(venue, key);
  return normalizeContent(venue, readSeed(venue, key));
}

export async function writeSiteContent(venue: VenueConfig, key: ContentKey, content: SiteContent) {
  if (hasHostedCMS(venue)) { await writeCMSDocument(venue, key, content); return; }
  if (process.env.VERCEL) throw new Error("Hosted CMS storage is not configured.");
  if (USE_DB) {
    await writeDb(venue, key, content);
    return;
  }
  writeFileSync(seedPath(venue, key), `${JSON.stringify(content, null, 2)}\n`);
}

export async function copySiteContent(venue: VenueConfig, from: ContentKey, to: ContentKey) {
  if (hasHostedCMS(venue) || USE_DB) {
    const content = await readSiteContent(venue, from);
    await writeSiteContent(venue, to, content);
    return;
  }
  copyFileSync(seedPath(venue, from), seedPath(venue, to));
}
