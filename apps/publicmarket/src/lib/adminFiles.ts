import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const UPLOAD_DIR = path.join(process.cwd(), "public", "assets", "admin-uploads");

function slugifyFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension).toLowerCase();
  const slug = baseName.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "upload";
  return `${slug}${extension}`;
}

export function validateUploadFile(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension);
}

export function isUploadedAssetUrl(value: string) {
  if (value.startsWith("/assets/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveAdminUpload(file: File) {
  const safeName = slugifyFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;

  if (USE_BLOB) {
    const blob = await put(`admin-uploads/${fileName}`, file, { access: "public" });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);
  return `/assets/admin-uploads/${fileName}`;
}
