import { ADMIN_SESSION_COOKIE, adminCookieOptions } from "@/lib/adminAuth";
import { VENUE_SESSION_COOKIE, venueCookieOptions } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The one true sign-out: clears the collective session and the staff
// session (Blackbook rides the same sign-in), so nothing signs the user
// back in.
function clearAll(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  response.cookies.set(VENUE_SESSION_COOKIE, "", { ...venueCookieOptions, maxAge: 0 });
  return response;
}

export async function POST() {
  return clearAll(NextResponse.json({ ok: true }));
}
