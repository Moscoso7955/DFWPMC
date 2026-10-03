import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { listDoorEventsForToday } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasBlackbookSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const events = await listDoorEventsForToday();
  return Response.json({ events });
}
