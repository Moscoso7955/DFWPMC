import { hasAdminSession } from "@/lib/adminAuth";
import { unlinkContact } from "@/lib/contactsStore";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, linkId } = await params;
  await unlinkContact(id, linkId);
  return Response.json({ ok: true });
}
