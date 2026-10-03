import "server-only";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { venue } from "./venue";

export const hasHostedCMS = Boolean(process.env.CMS_STORAGE_READ_WRITE_TOKEN);

function token() {
  const value = process.env.CMS_STORAGE_READ_WRITE_TOKEN;
  if (!value) throw new Error("Hosted CMS storage is not configured.");
  return value;
}
function documentPath(name: string) {
  if (!/^[a-z][a-z-]*$/.test(name)) throw new Error("Invalid CMS document name.");
  const scope = process.env.CMS_STORAGE_SCOPE === "preview" ? "preview" : "production";
  return `${venue.id}/${scope}/cms/${name}.json`;
}
export async function readCMSDocument<T>(name: string, fallback: () => T): Promise<{ value: T; etag?: string }> {
  const blob = await get(documentPath(name), { access: "private", token: token(), useCache: false });
  if (!blob) return { value: fallback() };
  if (blob.statusCode !== 200) throw new Error("Could not read the CMS document.");
  // The gateway can mark a read ETag as weak; conditional writes require its strong version token.
  return { value: await new Response(blob.stream).json() as T, etag: blob.blob.etag.replace(/^W\//, "") };
}
export async function updateCMSDocument<T, R>(name: string, fallback: () => T, update: (value: T) => { value: T; result: R }): Promise<R> {
  // Retry a conflicting write against fresh content, preserving concurrent inbox/sign-up records.
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await readCMSDocument(name, fallback);
    const next = update(snapshot.value);
    try {
      await put(documentPath(name), JSON.stringify(next.value), {
        access: "private", token: token(), contentType: "application/json",
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
export async function writeCMSDocument<T>(name: string, value: T) {
  return updateCMSDocument(name, () => value, () => ({ value, result: undefined }));
}
export async function saveCMSMedia(filename: string, bytes: Blob | Buffer, contentType: string) {
  await put(`${venue.id}/uploads/${filename}`, bytes, {
    access: "private", token: token(), contentType, addRandomSuffix: false, allowOverwrite: false,
  });
}
export async function readCMSMedia(filename: string) {
  if (!hasHostedCMS || !/^[a-z0-9-]+\.(jpg|jpeg|png|webp|svg)$/.test(filename)) return null;
  return get(`${venue.id}/uploads/${filename}`, { access: "private", token: token(), useCache: false });
}
