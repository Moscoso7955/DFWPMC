import { hasBlackbookAdminSession } from "@/lib/blackbookAuth";
import { saveAdminUpload, validateUploadFile } from "@/lib/adminFiles";
import { getVenue, disconnectedResponse } from "@/lib/venues";

export async function POST(request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (venue.localPreview) return disconnectedResponse("Blackbook backend");

  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json({ error: "Unsupported file" }, { status: 400 });
  }

  const src = await saveAdminUpload(venue, file);
  return Response.json({ src });
}
