import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COLLECTIVE_SESSION_COOKIE = "fwpm_admin_session";
const SESSION_HOURS = 12;

function adminPassword() {
  const value = process.env.COLLECTIVE_ADMIN_PASSWORD;
  if (!value) throw new Error("COLLECTIVE_ADMIN_PASSWORD is not configured.");
  return value;
}

function sessionSecret() {
  const value = process.env.COLLECTIVE_ADMIN_SESSION_SECRET;
  if (!value) throw new Error("COLLECTIVE_ADMIN_SESSION_SECRET is not configured.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function verifyCollectivePassword(candidate: string) {
  return safeEqual(candidate, adminPassword());
}

export function createSessionValue(now = Date.now()) {
  const expires = now + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires <= now) return false;
  return safeEqual(sign(`${parts[0]}.${parts[1]}`), parts[2]);
}

export async function hasCollectiveSession() {
  const store = await cookies();
  try {
    return verifySessionValue(store.get(COLLECTIVE_SESSION_COOKIE)?.value);
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: Boolean(process.env.VERCEL),
    sameSite: "lax" as const,
    path: "/admin",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}
