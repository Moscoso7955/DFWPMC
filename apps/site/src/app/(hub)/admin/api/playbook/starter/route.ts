import { hasAdminSession } from "@/lib/adminAuth";
import { importPlay } from "@/lib/playbookStore";
import { CHRISTMAS_STARTER } from "@/lib/playbookStarters";
import { todayIn } from "@/lib/playbookShared";
import { COLLECTIVE as VENUE } from "@/lib/venues";

// Adds the starter Christmas template (dated to the coming Christmas).
export async function POST() {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const today = todayIn(VENUE.timeZone);
  const year = Number(today.slice(0, 4)) + (today.slice(5) > "12-25" ? 1 : 0);
  const result = await importPlay(CHRISTMAS_STARTER, { targetDate: `${year}-12-25`, asTemplate: true });
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
