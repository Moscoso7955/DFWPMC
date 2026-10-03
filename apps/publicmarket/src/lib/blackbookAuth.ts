import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const BLACKBOOK_SESSION_COOKIE = "phoebe_blackbook_session";

export type BlackbookRole = "admin" | "viewer";

const DEFAULT_SESSION_AGE_SECONDS = 60 * 60 * 8;

function getBlackbookEnvValue(
  name:
    | "PHOEBE_BLACKBOOK_PASSWORD"
    | "PHOEBE_BLACKBOOK_VIEW_PASSWORD"
    | "PHOEBE_BLACKBOOK_SESSION_SECRET",
) {
  const value = process.env[name];
  if (value) return value;


  throw new Error(`${name} must be configured for the Blackbook.`);
}

function getSessionSecret() {
  return getBlackbookEnvValue("PHOEBE_BLACKBOOK_SESSION_SECRET");
}

export function getBlackbookPassword() {
  return getBlackbookEnvValue("PHOEBE_BLACKBOOK_PASSWORD");
}

export function getBlackbookViewPassword() {
  return getBlackbookEnvValue("PHOEBE_BLACKBOOK_VIEW_PASSWORD");
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function classifyBlackbookPassword(password: string): BlackbookRole | null {
  if (safeCompare(password, getBlackbookPassword())) return "admin";
  if (safeCompare(password, getBlackbookViewPassword())) return "viewer";
  return null;
}

export function createBlackbookSessionValue(role: BlackbookRole) {
  const payload = `blackbook.${role}.${Date.now()}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

export function readBlackbookSessionRole(value?: string): BlackbookRole | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const [scope, role, timestamp, signature] = parts;
  if (scope !== "blackbook") return null;
  if (role !== "admin" && role !== "viewer") return null;

  const payload = `${scope}.${role}.${timestamp}`;
  if (!safeCompare(signature, signSessionPayload(payload))) return null;

  return role;
}

export async function getBlackbookRole(): Promise<BlackbookRole | null> {
  const cookieStore = await cookies();
  return readBlackbookSessionRole(cookieStore.get(BLACKBOOK_SESSION_COOKIE)?.value);
}

export async function hasBlackbookSession() {
  return (await getBlackbookRole()) !== null;
}

export async function hasBlackbookAdminSession() {
  return (await getBlackbookRole()) === "admin";
}

export const blackbookCookieOptions = {
  httpOnly: true,
  maxAge: DEFAULT_SESSION_AGE_SECONDS,
  path: "/blackbook",
  sameSite: "lax" as const,
};
