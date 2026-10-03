import { saveAdminUpload, validateUploadFile } from "@/lib/adminFiles";
import { hasAdminSession } from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }

  const src = await saveAdminUpload(file);
  return Response.json({ src });
}
