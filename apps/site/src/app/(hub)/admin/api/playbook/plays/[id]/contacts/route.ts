import { hasAdminSession } from "@/lib/adminAuth";
import { linkContact, saveContact } from "@/lib/contactsStore";
import { can } from "@/lib/session";

// Attaches a contact to the play or one of its tasks: { contactId } for an
// existing contact, or { contact: {...} } to add a new one and attach it.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await can("contacts"))) return Response.json({ error: "You don't have access to contacts." }, { status: 403 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { contactId?: unknown; contact?: Record<string, unknown>; taskId?: unknown; label?: unknown };
  let contactId = typeof body.contactId === "string" ? body.contactId : null;
  if (!contactId && body.contact) {
    const saved = await saveContact(body.contact);
    if (!saved.ok) return Response.json({ error: saved.error }, { status: 400 });
    contactId = saved.contact.id;
  }
  if (!contactId) return Response.json({ error: "Pick a contact." }, { status: 400 });
  const taskId = typeof body.taskId === "string" && /^[0-9a-f-]{36}$/i.test(body.taskId) ? body.taskId : null;
  const linkId = await linkContact(id, contactId, taskId, typeof body.label === "string" ? body.label : "");
  return linkId ? Response.json({ ok: true, linkId }) : Response.json({ error: "That contact no longer exists." }, { status: 404 });
}
