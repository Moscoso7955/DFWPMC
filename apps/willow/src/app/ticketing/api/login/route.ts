import { venueRequestUrl, venuePath } from "@/lib/venue";
import { TICKETING_SESSION_COOKIE, classifyTicketingPassword, createTicketingSessionValue, ticketingCookieOptions, } from "@/lib/ticketingAuth";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
    const formData = await request.formData();
    const password = String(formData.get("password") || "");
    const role = classifyTicketingPassword(password);
    if (!role) {
        return NextResponse.redirect(new URL(venuePath("/ticketing/login?error=1"), venueRequestUrl(request)), 303);
    }
    const destination = role === "manager" ? "/ticketing" : "/ticketing/door";
    const response = NextResponse.redirect(new URL(venuePath(destination), venueRequestUrl(request)), 303);
    // Purge any pre-existing cookie held at the old /ticketing scope so
    // the browser doesn't send a stale value to /api/ticketing/qbo-*.
    response.cookies.set(TICKETING_SESSION_COOKIE, "", { maxAge: 0, path: venuePath("/ticketing") });
    response.cookies.set(TICKETING_SESSION_COOKIE, createTicketingSessionValue(role), ticketingCookieOptions);
    return response;
}
