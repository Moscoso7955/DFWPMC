import { NextRequest, NextResponse } from "next/server";
import { COLLECTIVE_SESSION_COOKIE, sessionCookieOptions } from "@/lib/collective/auth";
import { COLLECTIVE_VENUES } from "@/lib/collective/venues";
import { venueSessionCookieName, venueSessionCookieOptions } from "@/lib/collective/venueSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The one true sign-out. The venue portals' Log Out buttons land here
// after clearing their own cookie; this clears the collective session and
// every venue session the hub minted, so nothing signs the user back in.
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(COLLECTIVE_SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  for (const venue of COLLECTIVE_VENUES) {
    response.cookies.set(venueSessionCookieName(venue), "", {
      ...venueSessionCookieOptions(venue),
      maxAge: 0,
    });
  }
  return response;
}
