import { venue } from "./venue";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const TICKETING_SESSION_COOKIE = `${venue.id}_ticketing_session`;

export type TicketingRole = "manager" | "door";

const DEFAULT_SESSION_AGE_SECONDS = 60 * 60 * 12;

function getEnvValue(
  name:
    | "TICKETING_PASSWORD"
    | "TICKETING_DOOR_PASSWORD"
    | "TICKETING_SESSION_SECRET",
) {
  const value = process.env[name];
  if (value) return value;
  throw new Error(`${name} must be configured for the Ticketing portal.`);
}

function getSessionSecret() {
  return getEnvValue("TICKETING_SESSION_SECRET");
}

export function getManagerPassword() {
  return getEnvValue("TICKETING_PASSWORD");
}

export function getDoorPassword() {
  return getEnvValue("TICKETING_DOOR_PASSWORD");
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function classifyTicketingPassword(password: string): TicketingRole | null {
  if (safeCompare(password, getManagerPassword())) return "manager";
  if (safeCompare(password, getDoorPassword())) return "door";
  return null;
}

export function createTicketingSessionValue(role: TicketingRole) {
  const payload = `ticketing.${role}.${Date.now()}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

export function readTicketingSessionRole(value?: string): TicketingRole | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [scope, role, timestamp, signature] = parts;
  if (scope !== "ticketing") return null;
  if (role !== "manager" && role !== "door") return null;
  const payload = `${scope}.${role}.${timestamp}`;
  if (!safeCompare(signature, signSessionPayload(payload))) return null;
  return role;
}

export async function getTicketingRole(): Promise<TicketingRole | null> {
  const cookieStore = await cookies();
  return readTicketingSessionRole(cookieStore.get(TICKETING_SESSION_COOKIE)?.value);
}

export async function hasTicketingSession() {
  return (await getTicketingRole()) !== null;
}

export async function hasTicketingManagerSession() {
  return (await getTicketingRole()) === "manager";
}

export const ticketingCookieOptions = {
  httpOnly: true,
    secure: Boolean(process.env.VERCEL),
  maxAge: DEFAULT_SESSION_AGE_SECONDS,
  // All ticketing callbacks stay within this venue prefix.
  path: venue.basePath,
  sameSite: "lax" as const,
};
