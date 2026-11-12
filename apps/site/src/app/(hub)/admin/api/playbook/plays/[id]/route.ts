import { hasAdminSession } from "@/lib/adminAuth";
import { deletePlay, getPlay, updatePlay } from "@/lib/playbookStore";
import { todayIn } from "@/lib/playbookShared";
import { deleteObjects } from "@/lib/r2";
import { COLLECTIVE as VENUE } from "@/lib/venues";
import { can } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const found = await getPlay(id, todayIn(VENUE.timeZone));
  if (!found) return Response.json({ error: "Not found" }, { status: 404 });
  const play = (await can("playbook_budget")) ? found : { ...found, budget: [], budgetCents: null, spentCents: 0 };
  return Response.json({ play }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!(await can("playbook_budget"))) delete body.budgetCents;
  await updatePlay(id, body);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteObjects(await deletePlay(id));
  return Response.json({ ok: true });
}
