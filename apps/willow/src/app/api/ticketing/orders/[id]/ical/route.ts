import { getOrderById, getPublishedEventBySlug } from "@/lib/ticketingStore";
import { buildEventIcs } from "@/lib/icsCalendar";
import { getSiteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await getOrderById(id);
  if (!order) return new Response("Not found", { status: 404 });

  // Look up the event by the id stored on the order rather than a
  // published-slug lookup — even if the event later moves to draft
  // (e.g. a mistake), an already-issued .ics link still resolves.
  const { getEventById } = await import("@/lib/ticketingStore");
  const event = await getEventById(order.eventId);
  if (!event) return new Response("Not found", { status: 404 });

  const siteUrl = getSiteUrl();
  const ics = buildEventIcs({
    uid: `preview-order-${order.id}@willow.local`,
    title: event.title,
    description: "Willow · show QR at door.",
    location: "Willow, Venue address to be added",
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    url: `${siteUrl}/calendar/${event.slug}/confirmation?order=${order.id}`,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="willow-${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
