import { hasAdminSession } from "@/lib/adminAuth";
import { hasUnpublishedChanges } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ unpublished: await hasUnpublishedChanges(venue) });
}
