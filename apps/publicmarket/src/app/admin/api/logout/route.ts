import { NextRequest, NextResponse } from "next/server";
import { COLLECTIVE_SESSION_COOKIE, sessionCookieOptions } from "@/lib/collective/auth";
import { COLLECTIVE_VENUES } from "@/lib/collective/venues";
import { venueSessionCookieName, venueSessionCookieOptions } from "@/lib/collective/venueSession";

export const runtime = "nodejs";

// Signing out of the collective also clears every venue session the hub
// minted, so one logout ends access everywhere.
export async function POST(request: NextRequest) {
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
