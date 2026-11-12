import { hasAdminSession } from "@/lib/adminAuth";
import { importContacts } from "@/lib/contactsStore";

// Contacts read from cards shared from a phone (parsed in the browser).
export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { contacts } = (await request.json().catch(() => ({}))) as { contacts?: unknown };
  if (!Array.isArray(contacts)) return Response.json({ error: "Nothing to import." }, { status: 400 });
  return Response.json({ ok: true, ...(await importContacts(contacts)) });
}
