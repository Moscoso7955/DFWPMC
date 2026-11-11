import { saveAdminUpload, validateUploadFile } from "@/lib/adminFiles";
import { hasAdminSession } from "@/lib/adminAuth";
import { getVenue } from "@/lib/venues";

export async function POST(request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }

  const src = await saveAdminUpload(venue, file);
  return Response.json({ src });
}
