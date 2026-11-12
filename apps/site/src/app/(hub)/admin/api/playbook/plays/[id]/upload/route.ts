import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/adminAuth";
import { photoKeys } from "@/lib/playbookStore";
import { isPhotoStorageConfigured, presignUpload } from "@/lib/r2";

// Signed links for one photo (look book or a supply), uploaded straight
// from the browser in three sizes. The returned key is saved on the row.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPhotoStorageConfigured()) return Response.json({ error: "Photo storage isn't set up." }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const key = `playbook/${id}/${randomUUID()}`;
  const [full, view, thumb] = await Promise.all(photoKeys(key).map((k) => presignUpload(k)));
  return Response.json({ key, uploads: { full, view, thumb } });
}
