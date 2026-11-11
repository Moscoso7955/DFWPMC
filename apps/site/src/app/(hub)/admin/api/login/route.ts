import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionValue,
  safeAdminNext,
  verifyAdminPassword,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

// The single login gate for the whole collective. Signing in opens the
// brand selector; choosing a brand there enters its portal directly.
export async function POST(request: NextRequest) {
  let candidate = "";
  let next = "/admin";
  try {
    const form = await request.formData();
    candidate = String(form.get("password") ?? "");
    next = safeAdminNext(form.get("next"));
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  try {
    if (!candidate || !verifyAdminPassword(candidate)) {
      return NextResponse.redirect(new URL(`/admin/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
    }
  } catch {
    // ADMIN_PASSWORD / session secret missing from the environment.
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), adminCookieOptions);
  return response;
}
