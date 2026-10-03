import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import {
  getEventById,
  getOrderById,
  getTicketingSettings,
  getTicketsForOrder,
} from "@/lib/ticketingStore";
import { sendTicketEmail } from "@/lib/ticketEmail";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const order = await getOrderById(id);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "paid") {
    return Response.json({ error: "Order not paid — nothing to resend." }, { status: 400 });
  }

  const [event, tickets, settings] = await Promise.all([
    getEventById(order.eventId),
    getTicketsForOrder(order.id),
    getTicketingSettings(),
  ]);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
  const active = tickets.filter((t) => t.status !== "void");
  if (active.length === 0) {
    return Response.json({ error: "No active tickets to send." }, { status: 400 });
  }

  const sent = await sendTicketEmail({
    event,
    order: {
      id: order.id,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      totalCents: order.totalCents,
      subtotalCents: order.subtotalCents,
      serviceFeeCents: order.serviceFeeCents,
      taxCents: order.taxCents,
    },
    tickets: active,
    settings,
  });

  if (!sent) {
    return Response.json({ error: "Email send failed. Check RESEND_API_KEY." }, { status: 500 });
  }
  return Response.json({ ok: true, sentTo: order.buyerEmail });
}
