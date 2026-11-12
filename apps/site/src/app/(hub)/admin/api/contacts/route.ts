import { hasAdminSession } from "@/lib/adminAuth";
import { saveContact } from "@/lib/contactsStore";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await saveContact((await request.json().catch(() => ({}))) as Record<string, unknown>);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
