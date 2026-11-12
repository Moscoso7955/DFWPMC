import { hasAdminSession } from "@/lib/adminAuth";
import { getOpexSummary, refreshOpex } from "@/lib/opexStore";

// Operating costs: pull fresh numbers now (the card's Refresh button).
export const maxDuration = 60;

export async function POST() {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await refreshOpex({ force: true, vercelDays: 45 });
  return Response.json({ ...result, summary: await getOpexSummary() });
}
