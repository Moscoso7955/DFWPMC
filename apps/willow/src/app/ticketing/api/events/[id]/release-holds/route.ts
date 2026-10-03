import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { getEventById, releaseHoldsForEvent } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Manager-only escape hatch that force-expires every pending order
// on the event and gives the held inventory back. The regular
// stale-holds cron only sweeps orders whose hold_expires_at is more
// than 5 minutes in the past, so a burst of failed checkouts (e.g.
// a Stripe outage or a config change like the recent
// `embedded` → `embedded_page` rename) can leave a tier looking sold
// out for up to 35 minutes. This endpoint clears that state
// immediately.
export async function POST(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const event = await getEventById(id);
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const released = await releaseHoldsForEvent(id);
  return Response.json({ ok: true, released });
}
