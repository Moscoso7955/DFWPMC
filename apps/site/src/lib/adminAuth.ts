
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export const ADMIN_SESSION_COOKIE = "pm_admin_session";
const DEFAULT_SESSION_AGE_SECONDS = 60 * 60 * 8;
function getAdminEnvValue(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
    // The hub project historically stored these under COLLECTIVE_* names.
    const value = process.env[name] ?? process.env[`COLLECTIVE_${name}`];
    if (value)
        return value;
    throw new Error(`${name} must be configured for the admin portal.`);
}
function getSessionSecret() {
    return getAdminEnvValue("ADMIN_SESSION_SECRET");
}
export function getAdminPassword() {
    return getAdminEnvValue("ADMIN_PASSWORD");
}
function signSessionPayload(payload: string) {
    return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}
function safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
export function verifyAdminPassword(password: string) {
    return safeCompare(password, getAdminPassword());
}
export function createAdminSessionValue() {
    const payload = `admin.${Date.now()}`;
    return `${payload}.${signSessionPayload(payload)}`;
}
export function verifyAdminSessionValue(value?: string) {
    if (!value)
        return false;
    const parts = value.split(".");
    if (parts.length !== 3)
        return false;
    const payload = `${parts[0]}.${parts[1]}`;
    return safeCompare(parts[2], signSessionPayload(payload));
}
/**
 * Can the signed-in person use the page or API being served? Every admin
 * route calls this; the area comes from the path (see src/proxy.ts and
 * PATH_AREAS), so each route is checked against its own area. The legacy
 * shared-password cookie counts as Admin until the venue's Admin first
 * signs in with Google (see src/lib/session.ts).
 */
export async function hasAdminSession() {
    const { can, currentArea } = await import("./session");
    return can(await currentArea());
}

/** Signed in at all (any area). */
export async function hasAnySession() {
    const { getPrincipal } = await import("./session");
    return (await getPrincipal()) !== null;
}

/** Where to go after signing in: only our own admin or blackbook pages. */
export function safeAdminNext(value: unknown): string {
    if (typeof value !== "string") return "/admin";
    if (!/^\/(?:(?:willow|madrone|publicmarketcafe)\/)?(admin|blackbook|upload)(\/|$|\?)/.test(value) || value.startsWith("//")) return "/admin";
    return value;
}
export const adminCookieOptions = {
    httpOnly: true,
    secure: Boolean(process.env.VERCEL),
    maxAge: DEFAULT_SESSION_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
};
