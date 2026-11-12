import { refreshOpex } from "@/lib/opexStore";
import { checkCostsAndAlert } from "@/lib/opexAlerts";

// Vercel Cron: refresh the Analytics operating-costs card every few hours.
// Vercel sends Authorization: Bearer <CRON_SECRET>.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET ?? "";
  if (cronSecret && bearer !== cronSecret) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const refreshed = await refreshOpex({ vercelDays: 400 });
  let check: unknown = null;
  try {
    check = await checkCostsAndAlert();
  } catch (error) {
    console.error("Operating costs check failed", error);
  }
  return Response.json({ ...refreshed, check });
}
