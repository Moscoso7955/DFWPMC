import { hasAdminSession } from "@/lib/adminAuth";
import { deleteContact, saveContact } from "@/lib/contactsStore";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await saveContact((await request.json().catch(() => ({}))) as Record<string, unknown>, id);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteContact(id);
  return Response.json({ ok: true });
}
