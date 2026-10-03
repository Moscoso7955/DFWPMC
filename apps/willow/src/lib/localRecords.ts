import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hasHostedCMS, readCMSDocument, updateCMSDocument } from "./cmsStorage";

const directory = path.join(process.cwd(), "content", "local-data");
function readFileRecords<T>(name: string): T[] {
  try { return JSON.parse(readFileSync(path.join(directory, `${name}.json`), "utf8")) as T[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
function writeFileRecords<T>(name: string, rows: T[]) {
  if (process.env.VERCEL) throw new Error("Hosted CMS storage is not configured.");
  mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, `${name}.json`), temporary = `${filename}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(rows, null, 2)}\n`);
  renameSync(temporary, filename);
}
export async function readLocalRecords<T>(name: string): Promise<T[]> {
  if (hasHostedCMS) return (await readCMSDocument<T[]>(name, () => [])).value;
  return readFileRecords<T>(name);
}
export async function updateLocalRecords<T, R>(name: string, update: (rows: T[]) => R): Promise<R> {
  if (hasHostedCMS) return updateCMSDocument<T[], R>(name, () => [], rows => ({ value: rows, result: update(rows) }));
  const rows = readFileRecords<T>(name), result = update(rows);
  writeFileRecords(name, rows);
  return result;
}
export function isWithinDays(iso: string, days: number) { return Date.parse(iso) >= Date.now() - days * 86400000; }
