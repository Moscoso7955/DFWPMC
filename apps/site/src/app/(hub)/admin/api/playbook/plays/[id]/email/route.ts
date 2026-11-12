import { hasAdminSession } from "@/lib/adminAuth";
import { renderKickoff, renderReminder, renderWeekly, sendKickoff } from "@/lib/playbookEmails";
import { getPlay, listPeople } from "@/lib/playbookStore";
import { addDays, todayIn } from "@/lib/playbookShared";
import { COLLECTIVE as VENUE } from "@/lib/venues";

type Ctx = { params: Promise<{ id: string }> };

// GET ?kind=kickoff|weekly|reminder: preview the email as a manager would get it.
export async function GET(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const today = todayIn(VENUE.timeZone);
  const [play, people] = await Promise.all([getPlay(id, today), listPeople()]);
  if (!play) return new Response("Not found", { status: 404 });
  const name = people.find((p) => p.role === "management" && p.active)?.name ?? "there";
  const kind = new URL(request.url).searchParams.get("kind");
  // Preview the kickoff as of its own day, so it reads like the real thing.
  const day = play.planStart && play.planStart > today ? play.planStart : today;
  let html: string;
  if (kind === "weekly") {
    const open = play.tasks.filter((t) => !t.done);
    const due = (offset: number) => addDays(play.targetDate, offset);
    html = renderWeekly(
      [{ play, late: open.filter((t) => due(t.offsetDays) < today), week: open.filter((t) => due(t.offsetDays) >= today && due(t.offsetDays) <= addDays(today, 6)) }],
      people,
      name,
      today,
    ).html;
  } else if (kind === "reminder") {
    const next = play.tasks.filter((t) => !t.done && addDays(play.targetDate, t.offsetDays) >= today).slice(0, 2);
    html = renderReminder((next.length ? next : play.tasks.slice(0, 1)).map((task) => ({ play, task })), name, today).html;
  } else {
    html = renderKickoff(play, people, name, day).html;
  }
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// POST: send the kickoff now (e.g. the planning start already passed).
export async function POST(_request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const today = todayIn(VENUE.timeZone);
  const play = await getPlay(id, today);
  if (!play) return Response.json({ error: "Not found" }, { status: 404 });
  if (play.isTemplate) return Response.json({ error: "Templates don't send emails." }, { status: 409 });
  try {
    return Response.json({ ok: true, sent: await sendKickoff(play, today) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
