import { venueRequestUrl } from "@/lib/venue";
import { venue, disconnectedResponse, venuePath } from "@/lib/venue";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createOAuthState } from "@/lib/qboOAuth";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
export const dynamic = "force-dynamic";
const STATE_COOKIE = "phoebe_qbo_state";
export async function GET(request: Request) {
    if (venue.localPreview)
        return disconnectedResponse("Ticketing integration");
    if (!(await hasTicketingManagerSession())) {
        return NextResponse.redirect(new URL(venuePath("/ticketing/login"), venueRequestUrl(request)), 303);
    }
    try {
        const state = createOAuthState("/ticketing/qbo-connect");
        const authorizeUrl = buildAuthorizeUrl(state);
        const response = NextResponse.redirect(authorizeUrl, 303);
        response.cookies.set(STATE_COOKIE, state, {
            httpOnly: true,
            maxAge: 15 * 60,
            path: venuePath("/"),
            sameSite: "lax",
            secure: true,
        });
        return response;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Configuration error";
        return NextResponse.redirect(new URL(venuePath(`/ticketing/qbo-connect?error=${encodeURIComponent(message)}`), venueRequestUrl(request)), 303);
    }
}
