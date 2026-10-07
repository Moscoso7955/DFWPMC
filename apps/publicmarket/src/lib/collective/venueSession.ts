import "server-only";
import { createHmac } from "node:crypto";
import type { CollectiveVenue } from "./venues";

// After the single collective login, the hub signs each venue's own admin
// session so the original venue portals open without a second password.
// The value and cookie attributes mirror each venue app's src/lib/adminAuth.ts
// exactly — the venue's verifyAdminSessionValue() must accept what we mint.

const VENUE_SESSION_AGE_SECONDS = 60 * 60 * 8;

function venueSessionSecret(venue: CollectiveVenue) {
  const value = process.env[venue.sessionSecretEnv];
  if (!value) {
    throw new Error(`Venue sign-in for ${venue.name} is not configured (missing ${venue.sessionSecretEnv}).`);
  }
  return value;
}

export function createVenueSessionValue(venue: CollectiveVenue) {
  const payload = `admin.${Date.now()}`;
  const signature = createHmac("sha256", venueSessionSecret(venue)).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function venueSessionCookieName(venue: CollectiveVenue) {
  return `${venue.id}_admin_session`;
}

export function venueSessionCookieOptions(venue: CollectiveVenue) {
  return {
    httpOnly: true as const,
    secure: Boolean(process.env.VERCEL),
    maxAge: VENUE_SESSION_AGE_SECONDS,
    path: `${venue.basePath}/admin`,
    sameSite: "lax" as const,
  };
}
