import { hasAdminSession } from "@/lib/adminAuth";
import { publishDraftContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export async function POST(_request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await publishDraftContent(venue);
  return Response.json({ ok: true, content });
}
