import { sendDueUploadAlerts } from "@/lib/photoAlerts";

// Vercel Cron hits this every 10 minutes: emails Victoria and Chloe about
// photo nights that finished uploading. Vercel sends
// Authorization: Bearer <CRON_SECRET>.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET ?? "";
  if (cronSecret && bearer !== cronSecret) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.POSTGRES_URL) return Response.json({ ok: true, skipped: "No database." });

  try {
    return Response.json({ ok: true, ...(await sendDueUploadAlerts()) });
  } catch (error) {
    console.error("Photo upload alert failed", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
