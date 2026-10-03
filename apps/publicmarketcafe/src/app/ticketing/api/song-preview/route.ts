import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { resolveSongPreview, spotifyTrackId } from "@/lib/songPreview";

export const dynamic = "force-dynamic";

// Lets the event editor show which song a Spotify link resolved to
// (title, artist, playable 30s clip) before the manager saves.
export async function GET(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!spotifyTrackId(url)) {
    return Response.json({ error: "Paste a Spotify track link (open.spotify.com/track/…)." }, { status: 400 });
  }
  const preview = await resolveSongPreview(url);
  if (!preview) {
    return Response.json({ error: "Couldn't find a preview clip for that track." }, { status: 404 });
  }
  return Response.json({ preview });
}
