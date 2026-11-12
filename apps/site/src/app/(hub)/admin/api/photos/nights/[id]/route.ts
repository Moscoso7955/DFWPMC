import { hasAdminSession } from "@/lib/adminAuth";
import { SHARED_REVIEW, deleteFailedPhotos, deleteNight, reopenNightReview, setNightHidden, setReviewerDone } from "@/lib/photoStore";
import { deleteObjects } from "@/lib/r2";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown };

  if (body.action === "done" || body.action === "undone") {
    const result = await setReviewerDone(id, SHARED_REVIEW, body.action === "done");
    return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 409 });
  }
  if (body.action === "hide" || body.action === "show") {
    await setNightHidden(id, body.action === "hide");
    return Response.json({ ok: true });
  }
  if (body.action === "reopen") {
    await reopenNightReview(id);
    return Response.json({ ok: true });
  }
  if (body.action === "deleteFailed") {
    const { keys, nightDeleted } = await deleteFailedPhotos(id);
    await deleteObjects(keys);
    return Response.json({ ok: true, deleted: keys.length / 3, nightDeleted });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const keys = await deleteNight(id);
  await deleteObjects(keys);
  return Response.json({ ok: true, removed: keys.length });
}
