import { NextResponse } from "next/server";
import { findInvite } from "@/lib/accessStore";
import { siteRequestUrl } from "@/lib/venues";

// The link in an invite email: checks it, then signs them in with Google
// using the invited email.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = siteRequestUrl(request);
  const user = await findInvite(token).catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/admin/login?error=invite", base), 303);
  const start = new URL("/auth/google/start", base);
  start.searchParams.set("invite", token);
  start.searchParams.set("hint", user.email);
  return NextResponse.redirect(start, 303);
}
