import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hasHostedCMS, readCMSDocument, updateCMSDocument } from "./cmsStorage";
import type { VenueConfig } from "./venues";

const directory = (venue: VenueConfig) => path.join(process.cwd(), "content", venue.slug, "local-data");
function readFileRecords<T>(venue: VenueConfig, name: string): T[] {
  try { return JSON.parse(readFileSync(path.join(directory(venue), `${name}.json`), "utf8")) as T[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
function writeFileRecords<T>(venue: VenueConfig, name: string, rows: T[]) {
  if (process.env.VERCEL) throw new Error("Hosted CMS storage is not configured.");
  mkdirSync(directory(venue), { recursive: true });
  const filename = path.join(directory(venue), `${name}.json`), temporary = `${filename}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(rows, null, 2)}\n`);
  renameSync(temporary, filename);
}
export async function readLocalRecords<T>(venue: VenueConfig, name: string): Promise<T[]> {
  if (hasHostedCMS(venue)) return (await readCMSDocument<T[]>(venue, name, () => [])).value;
  return readFileRecords<T>(venue, name);
}
export async function updateLocalRecords<T, R>(venue: VenueConfig, name: string, update: (rows: T[]) => R): Promise<R> {
  if (hasHostedCMS(venue)) return updateCMSDocument<T[], R>(venue, name, () => [], rows => ({ value: rows, result: update(rows) }));
  const rows = readFileRecords<T>(venue, name), result = update(rows);
  writeFileRecords(venue, name, rows);
  return result;
}
export function isWithinDays(iso: string, days: number) { return Date.parse(iso) >= Date.now() - days * 86400000; }
