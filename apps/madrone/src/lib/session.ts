import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { venue } from "./venue";
import { ADMIN_ROLE, AREA_IDS, isArea, type AreaId, type VenueUser } from "./accessShared";
import { areasFor, getSessionUser, passwordsRetired } from "./accessStore";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "./adminAuth";

// Who's signed in and what they can reach.
//
// A Google sign-in sets the venue session cookie (user id + session
// version, signed). Every request re-checks the user in the database, so
// turning someone off or changing their roles takes effect immediately.
// Until the venue's Admin has signed in with Google once, the old shared
// admin password (and the hub-minted collective session) still works and
// counts as Admin.

export const VENUE_SESSION_COOKIE = `${venue.id}_venue_session`;
export const VENUE_SESSION_SECONDS = 60 * 60 * 24 * 30;
/** Set by src/proxy.ts on every admin request: the area the page or API belongs to. */
export const AREA_HEADER = "x-venue-area";
export const PATH_HEADER = "x-venue-path";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value) return `venue:${value}`;
  if (process.env.NODE_ENV !== "production") return "venue:local-dev-secret";
  throw new Error("ADMIN_SESSION_SECRET must be configured.");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

export function createVenueSessionValue(userId: string, version: number) {
  const payload = `${userId}.${version}.${Date.now() + VENUE_SESSION_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function readVenueSession(value?: string): { userId: string; version: number } | null {
  if (!value) return null;
  const [userId, version, expires, signature] = value.split(".");
  if (!userId || !version || !expires || !signature || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${userId}.${version}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { userId, version: Number(version) };
}

// Venues share the collective's domain under path prefixes, so the
// cookie is scoped to this venue's own paths.
export const venueCookieOptions = {
  httpOnly: true,
  maxAge: VENUE_SESSION_SECONDS,
  path: venue.basePath || "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export type Principal =
  | { kind: "user"; user: VenueUser; areas: Set<AreaId> }
  | { kind: "legacy"; areas: Set<AreaId> };

/** The signed-in person (once per request). */
export const getPrincipal = cache(async (): Promise<Principal | null> => {
  const cookieStore = await cookies();
  const session = readVenueSession(cookieStore.get(VENUE_SESSION_COOKIE)?.value);
  if (session && process.env.POSTGRES_URL) {
    const user = await getSessionUser(session.userId).catch(() => null);
    if (user && user.status === "active" && user.sessionVersion === session.version) {
      return { kind: "user", user, areas: user.roles.includes(ADMIN_ROLE) ? new Set(AREA_IDS) : await areasFor(user.roles) };
    }
  }
  if (verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value) && !(await passwordsRetired())) {
    return { kind: "legacy", areas: new Set(AREA_IDS) };
  }
  return null;
});

export async function can(area: AreaId): Promise<boolean> {
  const principal = await getPrincipal();
  return Boolean(principal?.areas.has(area));
}

/**
 * The area of the page or API being served, from the proxy. If the proxy
 * didn't run for some reason, only someone with People & access (Admin)
 * gets through.
 */
export async function currentArea(): Promise<AreaId> {
  const value = (await headers()).get(AREA_HEADER);
  return isArea(value) ? value : "people";
}

/** Where someone lands, in order: the main desks first, single-purpose screens last. */
const LANDING: AreaId[] = [
  "site",
  "playbook",
  "photo_review",
  "photo_events",
  "calendar",
  "contacts",
  "customers",
  "reports",
  "people",
  "door",
  "blackbook",
  "photo_upload",
];

export async function homeFor(principal: Principal | null): Promise<string | null> {
  if (!principal) return null;
  const { AREAS } = await import("./accessShared");
  const area = LANDING.find((a) => principal.areas.has(a));
  return AREAS.find((a) => a.id === area)?.home ?? null;
}
