import { hasBlackbookAdminSession } from "@/lib/blackbookAuth";
import { validateUploadFile } from "@/lib/adminFiles";
import { isBlackbookConnected, saveBlackbookPhoto } from "@/lib/blackbookStore";
import { disconnectedResponse } from "@/lib/venues";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function POST(request: Request) {
  if (!isBlackbookConnected()) return disconnectedResponse("Blackbook backend");

  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return Response.json({ error: "Photos can be up to 4 MB." }, { status: 400 });
  }

  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const src = await saveBlackbookPhoto(contentType, Buffer.from(await file.arrayBuffer()));
  if (!src) return disconnectedResponse("Blackbook backend");
  return Response.json({ src });
}
