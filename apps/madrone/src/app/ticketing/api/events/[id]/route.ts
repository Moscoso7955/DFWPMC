import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { parseEventInput } from "@/lib/ticketingAdminInput";
import { cancelEvent, deleteEvent, duplicateEvent, getEventById, updateEvent } from "@/lib/ticketingStore";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const event = await getEventById(id);
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ event });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "cancel") {
    const cancelled = await cancelEvent(id);
    if (!cancelled) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, event: cancelled });
  }

  if (body.action === "duplicate") {
    const copy = await duplicateEvent(id);
    if (!copy) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, event: copy });
  }

  const parsed = parseEventInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const event = await updateEvent(id, parsed);
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, event });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const result = await deleteEvent(id);
  if (!result.deleted) {
    const n = result.activeOrders;
    return Response.json(
      {
        error: `This event has ${n} paid order${n === 1 ? "" : "s"}. Refund ${n === 1 ? "it" : "them"} first, or cancel the event to take it off the site.`,
        activeOrders: n,
      },
      { status: 409 },
    );
  }
  return Response.json({ ok: true });
}
