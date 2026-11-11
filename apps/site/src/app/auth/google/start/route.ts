import { NextResponse } from "next/server";
import { safeAdminNext } from "@/lib/adminAuth";
import { siteRequestUrl } from "@/lib/venues";
import { OAUTH_COOKIE, authorizeUrl, isGoogleConfigured, newState, sealState } from "@/lib/googleAuth";

// Sends the browser to Google to sign in.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = siteRequestUrl(request);
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/admin/login?error=google_off", base), 303);
  }
  const invite = url.searchParams.get("invite");
  const state = newState(safeAdminNext(url.searchParams.get("next")), invite && /^[A-Za-z0-9_-]{20,80}$/.test(invite) ? invite : null);
  const redirectUri = new URL("/auth/google/callback", base).href;
  const response = NextResponse.redirect(authorizeUrl(state, redirectUri, url.searchParams.get("hint") ?? undefined), 303);
  response.cookies.set(OAUTH_COOKIE, sealState(state), {
    httpOnly: true,
    maxAge: 600,
    path: "/auth",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
