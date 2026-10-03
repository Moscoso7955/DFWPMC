import { venue, disconnectedResponse } from "@/lib/venue";
import { hasBlackbookAdminSession } from "@/lib/blackbookAuth";
import { saveAdminUpload, validateUploadFile } from "@/lib/adminFiles";

export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Blackbook backend");

  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }

  const src = await saveAdminUpload(file);
  return Response.json({ src });
}
