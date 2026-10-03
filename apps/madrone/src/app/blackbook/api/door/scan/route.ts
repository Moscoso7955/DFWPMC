import { venue, disconnectedResponse } from "@/lib/venue";
import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { checkInToken } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

// Payload: { token: string, expectedEventId?: string }
// Returns the CheckInResult shape.
export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Blackbook backend");

  if (!(await hasBlackbookSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: unknown; expectedEventId?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; expectedEventId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });

  const expectedEventId =
    typeof body.expectedEventId === "string" && body.expectedEventId.length > 0
      ? body.expectedEventId
      : null;

  const result = await checkInToken(token, {
    expectedEventId,
    actor: "blackbook", // per-user identity would go here if we had it
  });
  return Response.json({ result });
}
