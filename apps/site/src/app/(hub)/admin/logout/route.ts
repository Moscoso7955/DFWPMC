import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/adminAuth";
import { VENUE_SESSION_COOKIE, venueCookieOptions } from "@/lib/session";
import { blackbookCookieOptions, blackbookSessionCookie } from "@/lib/blackbookAuth";
import { VENUES } from "@/lib/venues";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The one true sign-out: clears the collective session, the staff session
// and every venue's blackbook session, so nothing signs the user back in.
function clearAll(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  response.cookies.set(VENUE_SESSION_COOKIE, "", { ...venueCookieOptions, maxAge: 0 });
  for (const venue of VENUES) {
    response.cookies.set(blackbookSessionCookie(venue), "", { ...blackbookCookieOptions(venue), maxAge: 0 });
  }
  return response;
}

export async function GET(request: Request) {
  return clearAll(NextResponse.redirect(new URL("/admin/login", request.url), 303));
}
