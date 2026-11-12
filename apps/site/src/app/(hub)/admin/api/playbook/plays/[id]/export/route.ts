import { hasAdminSession } from "@/lib/adminAuth";
import { exportPlay, getPlay, listPeople } from "@/lib/playbookStore";
import { todayIn } from "@/lib/playbookShared";
function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "play"
  );
}
import { COLLECTIVE as VENUE } from "@/lib/venues";
import { can } from "@/lib/session";

// The play as a file another venue can import (tasks, budget, supplies,
// key dates, run of show; no photos or people).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const [play, people] = await Promise.all([getPlay(id, todayIn(VENUE.timeZone)), listPeople()]);
  if (!play) return new Response("Not found", { status: 404 });
  const file = exportPlay(play, people);
  if (!(await can("playbook_budget"))) {
    file.budget = [];
    file.budgetCents = null;
  }
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="playbook-${slugify(play.title)}.json"`,
    },
  });
}
