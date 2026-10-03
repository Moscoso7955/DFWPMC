import { venuePath } from "@/lib/venue";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "./stripe";
// Intuit's OAuth 2.0 endpoints.
const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export type QboEnvironment = "sandbox" | "production";
export function getQboEnvironment(): QboEnvironment {
    const raw = (process.env.QBO_ENVIRONMENT ?? "sandbox").toLowerCase();
    return raw === "production" ? "production" : "sandbox";
}
export function getQboClientId(): string {
    const value = process.env.QBO_CLIENT_ID;
    if (!value)
        throw new Error("QBO_CLIENT_ID is not configured");
    return value;
}
export function getQboClientSecret(): string {
    const value = process.env.QBO_CLIENT_SECRET;
    if (!value)
        throw new Error("QBO_CLIENT_SECRET is not configured");
    return value;
}
// Default the redirect URI to /api/ticketing/qbo-callback under our
// public site URL, but honor an explicit override so the Intuit-side
// registration can point elsewhere if we ever move the route.
export function getQboRedirectUri(): string {
    const override = process.env.QBO_REDIRECT_URI;
    if (override)
        return override;
    return `${getSiteUrl()}/api/ticketing/qbo-callback`;
}
function getStateSecret(): string {
    const value = process.env.QBO_STATE_SECRET;
    if (value)
        return value;
    throw new Error("QBO_STATE_SECRET is not configured");
}
// The state parameter is a per-request nonce so we can tell an
// Intuit-callback apart from a spoofed one. It also carries the
// return path back to the portal so we don't have to store extra
// state anywhere.
export function createOAuthState(returnTo: string): string {
    const nonce = randomBytes(16).toString("base64url");
    const issued = Date.now();
    const payload = `${nonce}.${issued}.${encodeURIComponent(returnTo)}`;
    const signature = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}
function safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
export function verifyOAuthState(state: string, maxAgeMs = 15 * 60 * 1000): {
    ok: false;
} | {
    ok: true;
    returnTo: string;
} {
    const parts = state.split(".");
    if (parts.length !== 4)
        return { ok: false };
    const [nonce, issuedStr, returnToEncoded, signature] = parts;
    const payload = `${nonce}.${issuedStr}.${returnToEncoded}`;
    const expected = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
    if (!safeCompare(signature, expected))
        return { ok: false };
    const issued = Number(issuedStr);
    if (!Number.isFinite(issued))
        return { ok: false };
    if (Date.now() - issued > maxAgeMs)
        return { ok: false };
    return { ok: true, returnTo: decodeURIComponent(returnToEncoded) };
}
export function buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: getQboClientId(),
        scope: "com.intuit.quickbooks.accounting",
        response_type: "code",
        redirect_uri: getQboRedirectUri(),
        state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
}
type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
};
function basicAuthHeader(): string {
    const raw = `${getQboClientId()}:${getQboClientSecret()}`;
    return `Basic ${Buffer.from(raw).toString("base64")}`;
}
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getQboRedirectUri(),
    });
    const response = await fetch(venuePath(TOKEN_URL), {
        method: "POST",
        headers: {
            Authorization: basicAuthHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Intuit token exchange failed (${response.status}): ${text}`);
    }
    return (await response.json()) as TokenResponse;
}
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });
    const response = await fetch(venuePath(TOKEN_URL), {
        method: "POST",
        headers: {
            Authorization: basicAuthHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Intuit token refresh failed (${response.status}): ${text}`);
    }
    return (await response.json()) as TokenResponse;
}
export async function revokeToken(refreshToken: string): Promise<void> {
    const response = await fetch(venuePath(REVOKE_URL), {
        method: "POST",
        headers: {
            Authorization: basicAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ token: refreshToken }),
    });
    if (!response.ok && response.status !== 400) {
        // Intuit returns 200 on success and 400 on "already revoked" — both
        // fine. Anything else bubbles up.
        const text = await response.text();
        throw new Error(`Intuit token revoke failed (${response.status}): ${text}`);
    }
}
export function tokenResponseToConnectionInput(environment: QboEnvironment, realmId: string, tokens: TokenResponse) {
    const now = Date.now();
    return {
        environment,
        realmId,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000).toISOString(),
        refreshToken: tokens.refresh_token,
        refreshTokenExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString(),
    };
}
