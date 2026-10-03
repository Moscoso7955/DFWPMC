import { venue, disconnectedResponse } from "@/lib/venue";
import { markUnsubscribed } from "@/lib/subscribersStore";
import { hasSyncAuth } from "@/lib/syncAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Unsubscribe callback from the CallidusCo mailing app. Reasons it
// sends: "user_click" (they unsubscribed from a campaign), "bounced"
// (address is dead), "complained" (marked spam) — stored so a bounce
// stays distinguishable from a real opt-out. Idempotent; rows are
// never deleted (compliance record).
export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Callidus subscriber sync");

  if (!hasSyncAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; reason?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please provide a valid email." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 80) : "unspecified";

  await markUnsubscribed(email, reason);
  return Response.json({ ok: true, email });
}
