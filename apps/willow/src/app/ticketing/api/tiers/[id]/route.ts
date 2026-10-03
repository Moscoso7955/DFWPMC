import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { parseTierInput } from "@/lib/ticketingAdminInput";
import { deleteTier, updateTier } from "@/lib/ticketingStore";

type RouteContext = { params: Promise<{ id: string }> };

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
  const parsed = parseTierInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const tier = await updateTier(id, parsed);
  if (!tier) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, tier });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await deleteTier(id);
  return Response.json({ ok: true });
}
