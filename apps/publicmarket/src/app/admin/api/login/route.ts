import { NextRequest, NextResponse } from "next/server";
import {
  COLLECTIVE_SESSION_COOKIE,
  createSessionValue,
  sessionCookieOptions,
  verifyCollectivePassword,
} from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import {
  createVenueSessionValue,
  venueSessionCookieName,
  venueSessionCookieOptions,
} from "@/lib/collective/venueSession";

export const runtime = "nodejs";

// One password for the whole collective. Without a `venue` field the user
// came from /admin/login and lands on the brand selector; with one they
// came from a brand login screen, so the response also signs that venue's
// own session and opens its portal directly.
export async function POST(request: NextRequest) {
  let candidate = "";
  let venueSlug = "";
  try {
    const form = await request.formData();
    candidate = String(form.get("password") ?? "");
    venueSlug = String(form.get("venue") ?? "");
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const venue = venueSlug ? getCollectiveVenue(venueSlug) : undefined;
  const failurePath = venue ? `/admin/login/${venue.slug}?error=1` : "/admin/login?error=1";

  try {
    if (!candidate || !verifyCollectivePassword(candidate)) {
      return NextResponse.redirect(new URL(failurePath, request.url), 303);
    }
  } catch {
    // COLLECTIVE_ADMIN_PASSWORD / SESSION_SECRET missing from the environment.
    return NextResponse.redirect(new URL(failurePath, request.url), 303);
  }

  const destination = venue ? `${venue.basePath}/admin` : "/admin";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(COLLECTIVE_SESSION_COOKIE, createSessionValue(), sessionCookieOptions());
  if (venue) {
    try {
      response.cookies.set(
        venueSessionCookieName(venue),
        createVenueSessionValue(venue),
        venueSessionCookieOptions(venue),
      );
    } catch {
      // Venue secret not configured on the hub — fall back to the selector.
      return NextResponse.redirect(new URL("/admin", request.url), 303);
    }
  }
  return response;
}
