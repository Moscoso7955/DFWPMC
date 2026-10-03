import { venueRequestUrl } from "@/lib/venue";
import { venue, disconnectedResponse, venuePath } from "@/lib/venue";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, getQboEnvironment, tokenResponseToConnectionInput, verifyOAuthState, } from "@/lib/qboOAuth";
import { upsertQboConnection } from "@/lib/qboConnectionStore";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
export const dynamic = "force-dynamic";
const STATE_COOKIE = "phoebe_qbo_state";
// Intuit calls this after the manager approves the connection. The
// query string has: code, state, realmId, and (on refusal) error.
// This route is publicly reachable so Intuit's servers can hit it,
// but every branch enforces the state cookie + a valid manager
// session — a stray hit from anyone else lands them on /qbo-connect
// with an error explanation.
export async function GET(request: Request) {
    if (venue.localPreview)
        return disconnectedResponse("Ticketing integration");
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const realmId = url.searchParams.get("realmId");
    const denied = url.searchParams.get("error");
    const redirectTo = (path: string) => NextResponse.redirect(new URL(venuePath(path), venueRequestUrl(request)), 303);
    const withError = (message: string) => redirectTo(`/ticketing/qbo-connect?error=${encodeURIComponent(message)}`);
    // Intuit reviewers hit this URL empty-handed to confirm it 200s. Send
    // them to the connect page rather than 400ing.
    if (!code && !state && !realmId && !denied) {
        return redirectTo("/ticketing/qbo-connect");
    }
    if (!(await hasTicketingManagerSession())) {
        return redirectTo("/ticketing/login");
    }
    if (denied) {
        return withError(`Intuit returned: ${denied}`);
    }
    if (!code || !state || !realmId) {
        return withError("The QuickBooks callback was missing required parameters.");
    }
    // Read the cookie through Next's cookie API so URL encoding on the
    // way in/out is handled consistently. The regex approach we had
    // before matched raw header bytes and mismatched whenever Next
    // encoded any of the % / . characters in the state value.
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(STATE_COOKIE)?.value ?? null;
    // Signature check on the query-string state is the actual security
    // barrier (HMAC-signed nonce, 15-minute TTL). The cookie check is
    // additional CSRF protection — but if they mismatch by encoding
    // and both verify to the same signed nonce, we accept it.
    const check = verifyOAuthState(state);
    if (!check.ok) {
        return withError("QuickBooks callback state was invalid or expired.");
    }
    if (!stateCookie) {
        return withError("QuickBooks callback state cookie was missing. Try again from the Connect button.");
    }
    const cookieCheck = verifyOAuthState(stateCookie);
    if (!cookieCheck.ok) {
        return withError("QuickBooks state cookie was invalid or expired.");
    }
    // Both are signed and unexpired; require the nonce prefix to match.
    const stateNonce = state.split(".")[0];
    const cookieNonce = stateCookie.split(".")[0];
    if (stateNonce !== cookieNonce) {
        return withError("QuickBooks callback state didn't match the browser cookie.");
    }
    try {
        const environment = getQboEnvironment();
        const tokens = await exchangeCodeForTokens(code);
        const input = tokenResponseToConnectionInput(environment, realmId, tokens);
        await upsertQboConnection(input);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Token exchange failed.";
        return withError(message);
    }
    const response = redirectTo("/ticketing/qbo-connect?status=connected");
    // Burn the state cookie — nonce reuse should never succeed.
    response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: venuePath("/") });
    return response;
}
