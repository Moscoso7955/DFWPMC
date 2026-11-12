import { hasAdminSession } from "@/lib/adminAuth";
import { copyPlay, createPlay } from "@/lib/playbookStore";

// New play: blank, from a template, or a copy of an existing play (e.g.
// last year's Christmas). Copies move every date to the new day.
export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result =
    typeof body.sourceId === "string" && body.sourceId
      ? await copyPlay(body.sourceId, {
          title: String(body.title ?? ""),
          targetDate: String(body.targetDate ?? ""),
          planStart: typeof body.planStart === "string" && body.planStart ? body.planStart : null,
          ownerId: typeof body.ownerId === "string" ? body.ownerId || null : undefined,
          asTemplate: body.isTemplate === true,
        })
      : await createPlay(body);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
