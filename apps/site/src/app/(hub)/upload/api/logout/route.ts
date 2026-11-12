import { NextResponse } from "next/server";
import { CONTRIBUTOR_SESSION_COOKIE } from "@/lib/contributorAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/upload/login", request.url), 303);
  response.cookies.set(CONTRIBUTOR_SESSION_COOKIE, "", { path: "/upload", maxAge: 0 });
  return response;
}
