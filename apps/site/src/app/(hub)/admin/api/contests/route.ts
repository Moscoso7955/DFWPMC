import { hasAdminSession } from "@/lib/adminAuth";
import { createContest } from "@/lib/contestStore";
import { parseContestForm } from "@/lib/contestShared";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseContestForm(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const contest = await createContest(parsed.input);
  return Response.json({ ok: true, id: contest.id });
}
