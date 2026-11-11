import { hasAdminSession } from "@/lib/adminAuth";
import { isUploadedAssetUrl } from "@/lib/adminFiles";
import { isMenuContentField, updateDraftMenuField } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export async function PATCH(request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; value?: unknown };

  if (!isMenuContentField(body.field) || typeof body.value !== "string") {
    return Response.json({ error: "Invalid menu draft update" }, { status: 400 });
  }

  if (body.field === "image" && !isUploadedAssetUrl(body.value)) {
    return Response.json({ error: "Invalid menu image" }, { status: 400 });
  }

  if (body.field === "title" && body.value.trim().length < 1) {
    return Response.json({ error: "Invalid menu title" }, { status: 400 });
  }

  const content = await updateDraftMenuField(venue, body.field, body.value.trim());
  return Response.json({ ok: true, content });
}
