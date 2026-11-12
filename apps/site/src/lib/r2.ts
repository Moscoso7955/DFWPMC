import { AwsClient } from "aws4fetch";

// Cloudflare R2 photo storage. Browsers upload straight to R2 with
// short-lived signed links, so photos never pass through the site,
// and visitors load them from R2's public domain (no bandwidth fees).
//
// Env:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_URL   public domain on the bucket, e.g. https://photos.phoebe.social
//   R2_ENDPOINT     optional override of the S3 endpoint (local testing)

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  endpoint: string;
};

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = process.env.R2_BUCKET ?? "";
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  const endpoint = (process.env.R2_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "")).replace(/\/+$/, "");
  if (!endpoint) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, endpoint };
}

export function isPhotoStorageConfigured() {
  return readConfig() !== null;
}

function client(config: R2Config) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(config: R2Config, key: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${config.endpoint}/${config.bucket}/${path}`;
}

export function publicPhotoUrl(key: string) {
  const config = readConfig();
  const base = config?.publicUrl ?? (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  return `${base}/${key}`;
}

/** A signed PUT link the browser can upload one file to, valid for `expiresSeconds`. */
export async function presignUpload(key: string, expiresSeconds = 900): Promise<string> {
  const config = readConfig();
  if (!config) throw new Error("Photo storage is not configured");
  const url = new URL(objectUrl(config, key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client(config).sign(new Request(url, { method: "PUT" }), { aws: { signQuery: true } });
  return signed.url;
}

/** Byte size of a stored object, or null if it isn't there. */
export async function headObject(key: string): Promise<number | null> {
  const config = readConfig();
  if (!config) return null;
  const res = await client(config).fetch(objectUrl(config, key), { method: "HEAD" });
  if (!res.ok) return null;
  return Number(res.headers.get("content-length") ?? 0);
}

export async function deleteObjects(keys: string[]): Promise<void> {
  const config = readConfig();
  if (!config) return;
  const aws = client(config);
  // Small batches in parallel; a failed delete only leaves an orphaned file.
  for (let i = 0; i < keys.length; i += 8) {
    await Promise.all(
      keys.slice(i, i + 8).map((key) =>
        aws.fetch(objectUrl(config, key), { method: "DELETE" }).catch(() => null),
      ),
    );
  }
}
