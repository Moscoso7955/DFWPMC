import { venue, disconnectedResponse } from "@/lib/venue";
import { expireStaleHolds } from "@/lib/ticketingStore";

// Vercel Cron hits this every 5 minutes to sweep any pending order
// whose hold_expires_at + 5-minute grace has passed. Idempotent — the
// PL/pgSQL side uses FOR UPDATE SKIP LOCKED so a concurrent tick can
// never double-decrement held.
//
// Vercel Cron automatically sends an Authorization: Bearer header
// containing the value of the CRON_SECRET env var. Accept either
// CRON_SECRET (Vercel's canonical name) or VERCEL_CRON_SECRET
// (previous name in this project) so a rename or a mid-flight env
// change doesn't lock the cron out again.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Scheduled jobs");

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET ?? "";

  if (cronSecret) {
    if (bearer !== cronSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await expireStaleHolds();
  return Response.json({ ok: true, expired });
}

