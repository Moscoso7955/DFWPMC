import { deleteRole, renameRole, setRoleArea } from "@/lib/accessStore";
import { isArea } from "@/lib/accessShared";
import { accessActor } from "../../guard";

type Ctx = { params: Promise<{ id: string }> };

// { area, on } ticks a box in the grid; { name } renames the role.
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await accessActor())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { area?: unknown; on?: unknown; name?: unknown };
  if (isArea(body.area)) await setRoleArea(id, body.area, body.on === true);
  if (typeof body.name === "string") await renameRole(id, body.name);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await accessActor())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteRole(id);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
