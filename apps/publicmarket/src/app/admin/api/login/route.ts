import { NextRequest, NextResponse } from "next/server";
import {
  COLLECTIVE_SESSION_COOKIE,
  createSessionValue,
  sessionCookieOptions,
  verifyCollectivePassword,
} from "@/lib/collective/auth";

export const runtime = "nodejs";

// The single login gate for the whole collective. Signing in opens the
// brand selector; choosing a brand there enters its portal directly.
export async function POST(request: NextRequest) {
  let candidate = "";
  try {
    const form = await request.formData();
    candidate = String(form.get("password") ?? "");
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  try {
    if (!candidate || !verifyCollectivePassword(candidate)) {
      return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
    }
  } catch {
    // COLLECTIVE_ADMIN_PASSWORD / SESSION_SECRET missing from the environment.
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(COLLECTIVE_SESSION_COOKIE, createSessionValue(), sessionCookieOptions());
  return response;
}
