import { hasAdminSession } from "@/lib/adminAuth";
import {
  closeContestNow,
  deleteContest,
  getContestDashboard,
  moveContestToNight,
  removeEntry,
  setEntryVisibility,
  updateContest,
  voidVoteBurst,
} from "@/lib/contestStore";
import { parseContestForm } from "@/lib/contestShared";
import { deleteObjects } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const dashboard = await getContestDashboard(id);
  if (!dashboard) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(dashboard, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const entryId = typeof body.entryId === "string" ? body.entryId : "";

  switch (body.action) {
    case "update": {
      const parsed = parseContestForm((body.form ?? {}) as Record<string, unknown>);
      if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
      const result = await updateContest(id, parsed.input);
      return result.ok ? Response.json({ ok: true }) : Response.json({ error: result.error }, { status: 409 });
    }
    case "close":
      await closeContestNow(id);
      return Response.json({ ok: true });
    case "approve":
    case "hide":
      await setEntryVisibility(entryId, body.action);
      return Response.json({ ok: true });
    case "remove":
      await deleteObjects(await removeEntry(entryId));
      return Response.json({ ok: true });
    case "void": {
      if (typeof body.ip !== "string" || typeof body.from !== "string" || typeof body.categoryId !== "string") {
        return Response.json({ error: "Missing burst." }, { status: 400 });
      }
      const voided = await voidVoteBurst(id, body.ip, entryId, body.categoryId, body.from);
      return Response.json({ ok: true, voided });
    }
    case "move": {
      const result = await moveContestToNight(id);
      return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 409 });
    }
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteObjects(await deleteContest(id));
  return Response.json({ ok: true });
}
