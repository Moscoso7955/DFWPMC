import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import {
  createCompOrder,
  getEventById,
  getTicketingSettings,
} from "@/lib/ticketingStore";
import { sendTicketEmail } from "@/lib/ticketEmail";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Body: { tierId, quantity, buyerName, buyerEmail }
export async function POST(request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId } = await context.params;

  let body: {
    tierId?: unknown;
    quantity?: unknown;
    buyerName?: unknown;
    buyerEmail?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tierId = typeof body.tierId === "string" ? body.tierId : "";
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 0));
  const buyerName = typeof body.buyerName === "string" ? body.buyerName.trim() : "";
  const buyerEmail = typeof body.buyerEmail === "string" ? body.buyerEmail.trim() : "";

  if (!tierId) return Response.json({ error: "Choose a tier." }, { status: 400 });
  if (!buyerName) return Response.json({ error: "Enter a name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const created = await createCompOrder({
    eventId,
    tierId,
    quantity,
    buyerName,
    buyerEmail,
  });
  if (!created) {
    return Response.json({ error: "Comp could not be issued (tier missing or sold out)." }, { status: 400 });
  }

  const [event, settings] = await Promise.all([getEventById(eventId), getTicketingSettings()]);
  if (event) {
    try {
      await sendTicketEmail({
        event,
        order: {
          id: created.order.id,
          buyerEmail: created.order.buyerEmail,
          buyerName: created.order.buyerName,
          totalCents: 0,
          subtotalCents: 0,
          serviceFeeCents: 0,
          taxCents: 0,
        },
        tickets: created.tickets,
        settings,
      });
    } catch {
      // The order + tickets exist. Manager can Resend email later.
    }
  }

  return Response.json({
    ok: true,
    orderId: created.order.id,
    ticketsIssued: created.tickets.length,
  });
}
