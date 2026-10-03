import { hasAdminSession } from "@/lib/adminAuth";
import { publishDraftContent } from "@/lib/siteContent";

export async function POST() {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await publishDraftContent();
  return Response.json({ ok: true, content });
}
