import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Google sign-in (OpenID Connect, authorization code + PKCE).
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (the collective's sign-in
// app in Google Cloud; the one redirect URI is
// fwpublicmarket.com/auth/google/callback).
// GOOGLE_OAUTH_AUTHORIZE_URL / GOOGLE_OAUTH_TOKEN_URL only override
// Google's endpoints for local testing.

export const OAUTH_COOKIE = "pm_oauth";

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const AUTHORIZE_URL = () => process.env.GOOGLE_OAUTH_AUTHORIZE_URL ?? "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = () => process.env.GOOGLE_OAUTH_TOKEN_URL ?? "https://oauth2.googleapis.com/token";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? process.env.COLLECTIVE_ADMIN_SESSION_SECRET;
  if (value) return `oauth:${value}`;
  if (process.env.NODE_ENV !== "production") return "oauth:local-dev-secret";
  throw new Error("ADMIN_SESSION_SECRET must be configured.");
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export type OAuthState = { state: string; nonce: string; verifier: string; next: string; invite: string | null; exp: number };

/** The short-lived cookie that ties Google's answer back to this browser. */
export function sealState(s: OAuthState) {
  const payload = b64url(Buffer.from(JSON.stringify(s)));
  return `${payload}.${sign(payload)}`;
}

export function openState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthState;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function newState(next: string, invite: string | null): OAuthState {
  return {
    state: b64url(randomBytes(18)),
    nonce: b64url(randomBytes(18)),
    verifier: b64url(randomBytes(32)),
    next,
    invite,
    exp: Date.now() + 10 * 60 * 1000,
  };
}

export function authorizeUrl(s: OAuthState, redirectUri: string, loginHint?: string) {
  const url = new URL(AUTHORIZE_URL());
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", s.state);
  url.searchParams.set("nonce", s.nonce);
  url.searchParams.set("code_challenge", b64url(createHash("sha256").update(s.verifier).digest()));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export type GoogleIdentity = { sub: string; email: string; name: string };

/**
 * Trades the code for Google's ID token and checks it. The token comes
 * straight from Google's token endpoint over TLS (authenticated with our
 * client secret), so its claims are checked rather than its signature.
 */
export async function exchangeCode(code: string, s: OAuthState, redirectUri: string): Promise<GoogleIdentity | null> {
  const res = await fetch(TOKEN_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: s.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { id_token?: string };
  const part = data.id_token?.split(".")[1];
  if (!part) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(part, "base64url").toString());
  } catch {
    return null;
  }
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  if (!issuerOk || claims.aud !== process.env.GOOGLE_CLIENT_ID || !fresh || claims.nonce !== s.nonce) return null;
  if (claims.email_verified !== true || typeof claims.email !== "string" || typeof claims.sub !== "string") return null;
  return { sub: claims.sub, email: claims.email, name: typeof claims.name === "string" ? claims.name : "" };
}
