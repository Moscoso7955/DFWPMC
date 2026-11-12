import { hasAdminSession } from "@/lib/adminAuth";
import { importPlay } from "@/lib/playbookStore";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { file?: unknown; targetDate?: unknown; asTemplate?: unknown };
  const result = await importPlay(body.file, { targetDate: String(body.targetDate ?? ""), asTemplate: body.asTemplate !== false });
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
