import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { parsePromoInput } from "@/lib/ticketingPromoInput";
import { createPromoCode, listPromoCodesForEvent } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const promos = await listPromoCodesForEvent(id);
  return Response.json({ promos });
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
  const parsed = parsePromoInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const promo = await createPromoCode(id, parsed);
  if (!promo) {
    return Response.json({ error: "Could not create promo (duplicate code?)." }, { status: 400 });
  }
  return Response.json({ ok: true, promo });
}
