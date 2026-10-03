import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { searchDoorTickets } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasBlackbookSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const eventId = url.searchParams.get("event");
  const q = url.searchParams.get("q");
  if (!eventId || !q) {
    return Response.json({ error: "Missing event or query" }, { status: 400 });
  }
  const matches = await searchDoorTickets(eventId, q);
  return Response.json({ matches });
}
