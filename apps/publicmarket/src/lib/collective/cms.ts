import "server-only";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { venueCMSToken, type CollectiveVenue } from "./venues";

// Mirrors each venue app's src/lib/cmsStorage.ts so the unified admin
// reads and writes the exact documents the live venue sites consume.

function documentPath(venue: CollectiveVenue, name: string) {
  if (!/^[a-z][a-z-]*$/.test(name)) throw new Error("Invalid CMS document name.");
  const scope = process.env.CMS_STORAGE_SCOPE === "preview" ? "preview" : "production";
  return `${venue.id}/${scope}/cms/${name}.json`;
}

export async function readCMSDocument<T>(
  venue: CollectiveVenue,
  name: string,
): Promise<{ value: T; etag?: string } | null> {
  const blob = await get(documentPath(venue, name), {
    access: "private",
    token: venueCMSToken(venue),
    useCache: false,
  });
  if (!blob) return null;
  if (blob.statusCode !== 200) throw new Error(`Could not read the ${venue.name} CMS document "${name}".`);
  // The gateway can mark a read ETag as weak; conditional writes require its strong version token.
  return {
    value: (await new Response(blob.stream).json()) as T,
    etag: blob.blob.etag.replace(/^W\//, ""),
  };
}

export async function updateCMSDocument<T, R>(
  venue: CollectiveVenue,
  name: string,
  fallback: () => T,
  update: (value: T) => { value: T; result: R },
): Promise<R> {
  // Retry a conflicting write against fresh content.
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = (await readCMSDocument<T>(venue, name)) ?? { value: fallback(), etag: undefined };
    const next = update(snapshot.value);
    try {
      await put(documentPath(venue, name), JSON.stringify(next.value), {
        access: "private",
        token: venueCMSToken(venue),
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: Boolean(snapshot.etag),
        ...(snapshot.etag ? { ifMatch: snapshot.etag } : {}),
      });
      return next.result;
    } catch (error) {
      if (
        error instanceof BlobPreconditionFailedError ||
        (error instanceof Error && /(already exists|conflicting operation)/i.test(error.message))
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Another edit is being saved. Please try again.");
}

export async function saveCMSMedia(
  venue: CollectiveVenue,
  filename: string,
  bytes: Blob,
  contentType: string,
) {
  await put(`${venue.id}/uploads/${filename}`, bytes, {
    access: "private",
    token: venueCMSToken(venue),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
}
