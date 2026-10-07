import { NextRequest, NextResponse } from "next/server";
import { COLLECTIVE_SESSION_COOKIE, sessionCookieOptions } from "@/lib/collective/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(COLLECTIVE_SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
