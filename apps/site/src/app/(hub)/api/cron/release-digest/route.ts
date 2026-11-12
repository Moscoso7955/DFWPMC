import { sendDueDigest } from "@/lib/releaseDigest";

// Vercel Cron hits this hourly; it only sends during the 8 AM hour in
// Fort Worth, so the email lands at the same local time all year.
// Vercel sends Authorization: Bearer <CRON_SECRET>.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET ?? "";
  if (cronSecret && bearer !== cronSecret) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const hour = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" });
  if (Number(hour) !== 8) return Response.json({ ok: true, skipped: "Not 8 AM in Fort Worth." });

  try {
    return Response.json({ ok: true, ...(await sendDueDigest()) });
  } catch (error) {
    console.error("Release digest failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
