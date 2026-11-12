import { sendDuePlaybookEmails } from "@/lib/playbookEmails";
import { COLLECTIVE as VENUE } from "@/lib/venues";

// Vercel Cron hits this hourly; Playbook emails go out during the 8 AM
// hour, venue time. Vercel sends Authorization: Bearer <CRON_SECRET>.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET ?? "";
  if (cronSecret && bearer !== cronSecret) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.POSTGRES_URL) return Response.json({ ok: true, skipped: "No database." });

  const hour = new Date().toLocaleString("en-US", { timeZone: VENUE.timeZone, hour: "numeric", hourCycle: "h23" });
  if (Number(hour) !== 8 && !process.env.PLAYBOOK_EMAILS_ANY_HOUR) return Response.json({ ok: true, skipped: "Not 8 AM at the venue." });

  try {
    return Response.json({ ok: true, ...(await sendDuePlaybookEmails()) });
  } catch (error) {
    console.error("Playbook emails failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
