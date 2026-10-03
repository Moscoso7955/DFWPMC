import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionValue,
  verifyAdminPassword,
} from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");

  if (!verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(), adminCookieOptions);
  return response;
}
