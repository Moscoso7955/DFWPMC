import { NextResponse } from "next/server";
import {
  CONTRIBUTOR_SESSION_COOKIE,
  CONTRIBUTOR_SESSION_SECONDS,
  createContributorSessionValue,
} from "@/lib/contributorAuth";
import { verifyContributorLogin } from "@/lib/photoStore";

export async function POST(request: Request) {
  if (!process.env.POSTGRES_URL) return Response.json({ error: "Photo uploads aren't switched on yet." }, { status: 503 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const contributor = email && password ? await verifyContributorLogin(email, password).catch(() => null) : null;

  if (!contributor) {
    // Slow down guessing a little.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.redirect(new URL("/upload/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/upload", request.url), 303);
  response.cookies.set(CONTRIBUTOR_SESSION_COOKIE, createContributorSessionValue(contributor.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/upload",
    maxAge: CONTRIBUTOR_SESSION_SECONDS,
  });
  return response;
}
