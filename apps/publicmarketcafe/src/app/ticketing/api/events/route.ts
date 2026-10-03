import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { parseEventInput } from "@/lib/ticketingAdminInput";
import { createEvent, listAllEvents } from "@/lib/ticketingStore";

export async function GET() {
  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await listAllEvents();
  return Response.json({ events });
}

export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseEventInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const event = await createEvent(parsed);
  return Response.json({ ok: true, event });
}
