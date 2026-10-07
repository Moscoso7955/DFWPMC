import { NextRequest, NextResponse } from "next/server";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import {
  createVenueSessionValue,
  venueSessionCookieName,
  venueSessionCookieOptions,
} from "@/lib/collective/venueSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Selector → portal. With a collective session, signs the chosen venue's
// own admin session (mirroring the venue app's cookie exactly) and opens
// its original portal — no second password.
export async function GET(request: NextRequest, context: { params: Promise<{ venue: string }> }) {
  if (!(await hasCollectiveSession())) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }
  const { venue: venueSlug } = await context.params;
  const venue = getCollectiveVenue(venueSlug);
  if (!venue) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }

  const response = NextResponse.redirect(new URL(`${venue.basePath}/admin`, request.url), 303);
  try {
    response.cookies.set(
      venueSessionCookieName(venue),
      createVenueSessionValue(venue),
      venueSessionCookieOptions(venue),
    );
  } catch {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  return response;
}
