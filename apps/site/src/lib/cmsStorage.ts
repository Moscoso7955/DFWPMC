import "server-only";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import type { VenueConfig } from "./venues";

// Each venue keeps its own private Blob store, exactly as it did as a
// separate deployment: same tokens, same document paths, no migration.
// The token comes from CMS_<VENUE>_TOKEN (e.g. CMS_WILLOW_TOKEN), with
// CMS_STORAGE_READ_WRITE_TOKEN as a single-store fallback for local use.

export function hasHostedCMS(venue: VenueConfig) {
  return Boolean(process.env[`CMS_${venue.envPrefix}_TOKEN`] ?? process.env.CMS_STORAGE_READ_WRITE_TOKEN);
}

function token(venue: VenueConfig) {
  const value = process.env[`CMS_${venue.envPrefix}_TOKEN`] ?? process.env.CMS_STORAGE_READ_WRITE_TOKEN;
  if (!value) throw new Error("Hosted CMS storage is not configured.");
  return value;
}
function documentPath(venue: VenueConfig, name: string) {
  if (!/^[a-z][a-z-]*$/.test(name)) throw new Error("Invalid CMS document name.");
  const scope = process.env.CMS_STORAGE_SCOPE === "preview" ? "preview" : "production";
  return `${venue.id}/${scope}/cms/${name}.json`;
}
export async function readCMSDocument<T>(venue: VenueConfig, name: string, fallback: () => T): Promise<{ value: T; etag?: string }> {
  const blob = await get(documentPath(venue, name), { access: "private", token: token(venue), useCache: false });
  if (!blob) return { value: fallback() };
  if (blob.statusCode !== 200) throw new Error("Could not read the CMS document.");
  // The gateway can mark a read ETag as weak; conditional writes require its strong version token.
  return { value: await new Response(blob.stream).json() as T, etag: blob.blob.etag.replace(/^W\//, "") };
}
export async function updateCMSDocument<T, R>(venue: VenueConfig, name: string, fallback: () => T, update: (value: T) => { value: T; result: R }): Promise<R> {
  // Retry a conflicting write against fresh content, preserving concurrent inbox/sign-up records.
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await readCMSDocument(venue, name, fallback);
    const next = update(snapshot.value);
    try {
      await put(documentPath(venue, name), JSON.stringify(next.value), {
        access: "private", token: token(venue), contentType: "application/json",
        addRandomSuffix: false, allowOverwrite: Boolean(snapshot.etag),
        ...(snapshot.etag ? { ifMatch: snapshot.etag } : {}),
      });
      return next.result;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || (error instanceof Error && /(already exists|conflicting operation)/i.test(error.message))) continue;
      throw error;
    }
  }
  throw new Error("Another edit is being saved. Please try again.");
}
export async function writeCMSDocument<T>(venue: VenueConfig, name: string, value: T) {
  return updateCMSDocument(venue, name, () => value, () => ({ value, result: undefined }));
}
export async function saveCMSMedia(venue: VenueConfig, filename: string, bytes: Blob | Buffer, contentType: string) {
  await put(`${venue.id}/uploads/${filename}`, bytes, {
    access: "private", token: token(venue), contentType, addRandomSuffix: false, allowOverwrite: false,
  });
}
export async function readCMSMedia(venue: VenueConfig, filename: string) {
  if (!hasHostedCMS(venue) || !/^[a-z0-9-]+\.(jpg|jpeg|png|webp|svg)$/.test(filename)) return null;
  return get(`${venue.id}/uploads/${filename}`, { access: "private", token: token(venue), useCache: false });
}
