import { hasAdminSession } from "@/lib/adminAuth";
import { getOpexSummary, saveCostsStart, saveFixedCosts } from "@/lib/opexStore";

// Operating costs: save the fixed-cost list from the Analytics card.
export async function PUT(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { costs?: unknown; costsStart?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const start = await saveCostsStart(body.costsStart);
  if (!start.ok) return Response.json({ error: start.error }, { status: 400 });
  const result = await saveFixedCosts(body.costs);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, summary: await getOpexSummary() });
}
