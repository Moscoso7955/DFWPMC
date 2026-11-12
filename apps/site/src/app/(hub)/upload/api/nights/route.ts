import { getContributorSession } from "@/lib/contributorAuth";
import { getOrCreateNight, isNightDate } from "@/lib/photoStore";
import { findVenue } from "@/lib/venues";

export async function POST(request: Request) {
  const contributor = await getContributorSession();
  if (!contributor) return Response.json({ error: "Please log in again." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { date?: unknown; title?: unknown; venue?: unknown };
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  const date = typeof body.date === "string" ? body.date : "";
  if (!isNightDate(date) || !title) {
    return Response.json({ error: "Pick a night and give it a name." }, { status: 400 });
  }
  // Photos are of nights that have happened (allow a day of timezone slack).
  if (Date.parse(`${date}T00:00:00Z`) > Date.now() + 36 * 60 * 60 * 1000) {
    return Response.json({ error: "That night hasn't happened yet." }, { status: 400 });
  }

  // Which venue the night shows at; empty means the whole market.
  const venue = body.venue ? findVenue(body.venue) : null;
  if (body.venue && !venue) return Response.json({ error: "Unknown venue." }, { status: 400 });

  const night = await getOrCreateNight(date, title, contributor.id, venue ? venue.slug : null);
  return Response.json({ night });
}
