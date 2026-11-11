import { venue, venuePath } from "@/lib/venue";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { VENUE_SESSION_COOKIE } from "@/lib/session";
import { NextResponse } from "next/server";

// One sign-in for everything, so signing out ends every session this
// venue set. Each cookie is cleared at the path it was set on; these need
// separate Set-Cookie headers (setting the same name twice through
// response.cookies keeps only the last one).
export async function POST() {
  const response = NextResponse.json({ ok: true });
  const paths: [string, string][] = [
    [ADMIN_SESSION_COOKIE, venuePath("/admin")],
    [VENUE_SESSION_COOKIE, venue.basePath || "/"],
    [`${venue.id}_blackbook_session`, venuePath("/blackbook")],
  ];
  for (const [name, path] of paths) {
    response.headers.append("Set-Cookie", `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax`);
  }
  return response;
}
