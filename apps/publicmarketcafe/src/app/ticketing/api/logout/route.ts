import { venuePath } from "@/lib/venue";
import { TICKETING_SESSION_COOKIE } from "@/lib/ticketingAuth";
import { NextResponse } from "next/server";
export async function POST() {
    const response = NextResponse.json({ ok: true });
    // Clear both scopes — the current path=/ cookie plus any lingering
    // old-path=/ticketing cookie carried over from before the widen.
    response.cookies.set(TICKETING_SESSION_COOKIE, "", { maxAge: 0, path: venuePath("/") });
    response.cookies.set(TICKETING_SESSION_COOKIE, "", { maxAge: 0, path: venuePath("/ticketing") });
    return response;
}
