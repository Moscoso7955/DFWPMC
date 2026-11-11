import { hasAdminSession } from "@/lib/adminAuth";
import { isCareersContentField, updateDraftCareersField } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export async function PATCH(request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; value?: unknown };

  if (!isCareersContentField(body.field) || typeof body.value !== "string") {
    return Response.json({ error: "Invalid careers draft update" }, { status: 400 });
  }

  const value = body.field === "embedCode" ? body.value : body.value.trim();

  if (body.field === "title" && value.length < 1) {
    return Response.json({ error: "Invalid careers title" }, { status: 400 });
  }

  const content = await updateDraftCareersField(venue, body.field, value);
  return Response.json({ ok: true, content });
}
