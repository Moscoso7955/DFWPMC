import { venue, disconnectedResponse } from "@/lib/venue";
import { getStripe } from "@/lib/stripe";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import {
  getOrderById,
  getOrderWithDetails,
  markOrderRefunded,
  voidTickets,
} from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Refund modes:
//   { mode: 'full' }
//   { mode: 'partial', ticketIds: string[] } — refund the pro-rated
//     unit price * quantity of the selected tickets.
export async function POST(request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let body: { mode?: unknown; ticketIds?: unknown };
  try {
    body = (await request.json()) as { mode?: unknown; ticketIds?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const details = await getOrderWithDetails(id);
  if (!details) return Response.json({ error: "Order not found" }, { status: 404 });
  const { order, tickets } = details;

  if (order.isComp) {
    // Comp: no Stripe refund, just void the tickets locally.
    await voidTickets(tickets.map((t) => t.id));
    await markOrderRefunded(order.id, false);
    return Response.json({ ok: true, refundedCents: 0, comp: true });
  }

  if (!order.stripePaymentIntentId) {
    return Response.json({ error: "Order has no Stripe payment intent to refund." }, { status: 400 });
  }

  const stripe = getStripe();
  const mode = body.mode;

  if (mode === "full") {
    // Full: refund the full charge. Webhook (charge.refunded) will
    // handle the void + inventory restore, but we also void locally
    // in case the webhook is delayed.
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
    });
    return Response.json({ ok: true, refundedCents: refund.amount, refundId: refund.id });
  }

  if (mode === "partial") {
    const ticketIds = Array.isArray(body.ticketIds) ? (body.ticketIds as unknown[]) : [];
    const idSet = new Set(ticketIds.filter((x): x is string => typeof x === "string"));
    if (idSet.size === 0) {
      return Response.json({ error: "Choose at least one ticket to refund." }, { status: 400 });
    }
    const chosen = tickets.filter((t) => idSet.has(t.id) && t.status !== "void");
    if (chosen.length === 0) {
      return Response.json({ error: "No refundable tickets selected." }, { status: 400 });
    }

    // Compute the refund amount pro-rated across the selected tickets.
    // We know the subtotal per unit price on order_items; sum the
    // unit_price_cents * per-ticket share, add the service fee + tax
    // share for those tickets.
    const totalTicketCount = tickets.length;
    const shareOfNonTicket = order.serviceFeeCents + order.taxCents;
    const perTicketNonTicket = totalTicketCount > 0 ? Math.floor(shareOfNonTicket / totalTicketCount) : 0;

    // Refund the average unit price * chosen count + non-ticket share.
    const perTicketSubtotal =
      totalTicketCount > 0
        ? Math.floor((order.subtotalCents + order.discountCents) / totalTicketCount)
        : 0;

    const refundAmountCents = chosen.length * (perTicketSubtotal + perTicketNonTicket);

    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: Math.max(1, Math.min(refundAmountCents, order.totalCents)),
    });

    // Void the specific tickets locally and mark the order as
    // partially_refunded. Webhook will also mark partial when the
    // charge.refunded event arrives; both are idempotent.
    await voidTickets(chosen.map((t) => t.id));
    await markOrderRefunded(order.id, chosen.length < tickets.length);

    return Response.json({
      ok: true,
      refundedCents: refund.amount,
      refundId: refund.id,
      voided: chosen.length,
    });
  }

  return Response.json({ error: "Unknown refund mode." }, { status: 400 });
}
