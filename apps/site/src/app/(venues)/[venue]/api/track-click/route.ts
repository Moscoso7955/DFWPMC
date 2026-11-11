import { isMenuClickTarget, recordMenuClick } from "@/lib/menuClicksStore";
import { getVenue } from "@/lib/venues";

export async function POST(request: Request, { params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  let body: { target?: unknown; source?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!isMenuClickTarget(body.target)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const source = typeof body.source === "string" && body.source.length <= 32 ? body.source : "bottom";

  try {
    await recordMenuClick(venue, body.target, source);
  } catch {
    // Swallow — tracking failures shouldn't break navigation.
  }

  return Response.json({ ok: true });
}
