import { hasAdminSession } from "@/lib/adminAuth";
import { hasUnpublishedChanges } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ unpublished: await hasUnpublishedChanges() });
}
