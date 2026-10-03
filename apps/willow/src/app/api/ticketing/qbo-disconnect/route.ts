import { venueRequestUrl } from "@/lib/venue";
import { venue, disconnectedResponse, venuePath } from "@/lib/venue";
import { NextResponse } from "next/server";
import { deleteQboConnection, getQboConnection } from "@/lib/qboConnectionStore";
import { getQboEnvironment, revokeToken } from "@/lib/qboOAuth";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
    if (venue.localPreview)
        return disconnectedResponse("Ticketing integration");
    if (!(await hasTicketingManagerSession())) {
        return NextResponse.redirect(new URL(venuePath("/ticketing/login"), venueRequestUrl(request)), 303);
    }
    const environment = getQboEnvironment();
    const connection = await getQboConnection(environment);
    // Revoke first — if Intuit rejects it we still delete our local
    // copy so the manager doesn't see a stuck "connected" state.
    if (connection) {
        try {
            await revokeToken(connection.refreshToken);
        }
        catch {
            // Ignore — proceed to delete the local row anyway.
        }
        await deleteQboConnection(environment);
    }
    return NextResponse.redirect(new URL(venuePath("/ticketing/qbo-connect?status=disconnected"), venueRequestUrl(request)), 303);
}
