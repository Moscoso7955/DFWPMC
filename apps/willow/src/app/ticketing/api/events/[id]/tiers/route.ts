import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { parseTierInput } from "@/lib/ticketingAdminInput";
import { createTier, listAllTiersForEvent } from "@/lib/ticketingStore";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const tiers = await listAllTiersForEvent(id);
  return Response.json({ tiers });
}

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = parseTierInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const tier = await createTier(id, parsed);
  return Response.json({ ok: true, tier });
}
