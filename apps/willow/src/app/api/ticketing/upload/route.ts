import { venue, disconnectedResponse } from "@/lib/venue";
import { saveAdminUpload, validateUploadFile } from "@/lib/adminFiles";
import { getTicketingRole } from "@/lib/ticketingAuth";

export const dynamic = "force-dynamic";

// Manager-only image upload for event flyers. Same storage plumbing as
// the marketing-side upload (Vercel Blob when the token is set,
// public/assets fallback in local dev), but scoped to the ticketing
// role cookie so a door-only user can't post flyers.
export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing integration");

  const role = await getTicketingRole();
  if (role !== "manager") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !validateUploadFile(file)) {
    return Response.json(
      { error: "Unsupported file. Use JPG, PNG, WEBP, or SVG." },
      { status: 400 },
    );
  }

  // Cap at 8 MiB so managers can't accidentally upload a 40MB RAW.
  // Vercel Blob would accept it, but the CDN cost and page weight
  // isn't worth it for a hero image.
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File is too large (max 8 MB)." }, { status: 400 });
  }

  const src = await saveAdminUpload(file);
  return Response.json({ src });
}
