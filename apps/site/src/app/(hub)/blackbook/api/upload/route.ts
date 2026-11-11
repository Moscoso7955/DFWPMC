import { hasBlackbookAdminSession } from "@/lib/blackbookAuth";
import { saveCollectiveUpload, validateUploadFile } from "@/lib/adminFiles";
import { LOCAL_PREVIEW, disconnectedResponse } from "@/lib/venues";

export async function POST(request: Request) {
  if (LOCAL_PREVIEW) return disconnectedResponse("Blackbook backend");

  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }

  const src = await saveCollectiveUpload(file);
  return Response.json({ src });
}
