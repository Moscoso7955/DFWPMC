import { venue, disconnectedResponse } from "@/lib/venue";
import { listSubscribersForSync } from "@/lib/subscribersStore";
import { hasSyncAuth } from "@/lib/syncAuth";

// Read feed for the CallidusCo mailing app: the full list, including
// unsubscribed rows (unsubscribedAt set) so removals made here are
// honored there. Optional ?since=<ISO> returns only rows whose
// updated_at is newer — cheap incremental sync.
export async function GET(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Callidus subscriber sync");

  if (!hasSyncAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new URL(request.url).searchParams.get("since");
  if (since && Number.isNaN(Date.parse(since))) {
    return Response.json({ error: "Invalid since timestamp" }, { status: 400 });
  }

  const subscribers = await listSubscribersForSync(since);
  return Response.json({ subscribers, syncedAt: new Date().toISOString() });
}
