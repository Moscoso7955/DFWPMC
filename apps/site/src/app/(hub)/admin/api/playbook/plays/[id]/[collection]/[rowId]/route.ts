import { hasAdminSession } from "@/lib/adminAuth";
import { deleteRow, isCollection, updateRow } from "@/lib/playbookStore";
import { deleteObjects } from "@/lib/r2";
import { can } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; collection: string; rowId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, collection, rowId } = await params;
  if (!isCollection(collection)) return Response.json({ error: "Not found" }, { status: 404 });
  if (collection === "budget" && !(await can("playbook_budget"))) return Response.json({ error: "No budget access." }, { status: 403 });
  await updateRow(id, collection, rowId, (await request.json().catch(() => ({}))) as Record<string, unknown>);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, collection, rowId } = await params;
  if (!isCollection(collection)) return Response.json({ error: "Not found" }, { status: 404 });
  if (collection === "budget" && !(await can("playbook_budget"))) return Response.json({ error: "No budget access." }, { status: 403 });
  await deleteObjects(await deleteRow(id, collection, rowId));
  return Response.json({ ok: true });
}
