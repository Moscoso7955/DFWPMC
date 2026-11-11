import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { completeSignIn } from "@/lib/accessStore";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { venuePath, venueRequestUrl } from "@/lib/venue";
import { OAUTH_COOKIE, exchangeCode, openState } from "@/lib/googleAuth";
import { VENUE_SESSION_COOKIE, createVenueSessionValue, venueCookieOptions } from "@/lib/session";

// Google sends people back here after they sign in.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = venueRequestUrl(request);
  const cookieStore = await cookies();
  const state = openState(cookieStore.get(OAUTH_COOKIE)?.value);
  const fail = (reason: string, extra = "") => {
    const response = NextResponse.redirect(new URL(venuePath(`/admin/login?error=${reason}${extra}`), base), 303);
    response.cookies.set(OAUTH_COOKIE, "", { path: venuePath("/auth"), maxAge: 0 });
    return response;
  };

  if (!state || url.searchParams.get("state") !== state.state) return fail("google");
  const code = url.searchParams.get("code");
  if (!code) return fail(url.searchParams.get("error") === "access_denied" ? "cancelled" : "google");

  const redirectUri = new URL(venuePath("/auth/google/callback"), base).href;
  const identity = await exchangeCode(code, state, redirectUri).catch(() => null);
  if (!identity) return fail("google");

  const result = await completeSignIn({ email: identity.email, sub: identity.sub, name: identity.name, inviteToken: state.invite });
  if (!result.ok) return fail(result.reason, `&email=${encodeURIComponent(identity.email)}`);

  const response = NextResponse.redirect(new URL(venuePath(state.next), base), 303);
  response.cookies.set(VENUE_SESSION_COOKIE, createVenueSessionValue(result.user.id, result.user.sessionVersion), venueCookieOptions);
  response.cookies.set(OAUTH_COOKIE, "", { path: venuePath("/auth"), maxAge: 0 });
  // The old shared-password session goes away with the first Google sign-in.
  response.headers.append("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; Path=${venuePath("/admin")}; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
