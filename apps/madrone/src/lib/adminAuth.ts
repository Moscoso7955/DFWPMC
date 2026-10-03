import { venue, venuePath } from "./venue";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export const ADMIN_SESSION_COOKIE = `${venue.id}_admin_session`;
const DEFAULT_SESSION_AGE_SECONDS = 60 * 60 * 8;
function getAdminEnvValue(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
    const value = process.env[name];
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
export async function hasAdminSession() {
    const cookieStore = await cookies();
    return verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
export const adminCookieOptions = {
    httpOnly: true,
    secure: Boolean(process.env.VERCEL),
    maxAge: DEFAULT_SESSION_AGE_SECONDS,
    path: venuePath("/admin"),
    sameSite: "lax" as const,
};
