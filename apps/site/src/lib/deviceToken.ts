import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// An anonymous id per phone, for "one entry / one vote per phone" in photo
// events. Kept in a signed cookie and echoed back from the browser's
// storage, so clearing one of the two isn't enough to vote again.

export const DEVICE_COOKIE = "pm_device";
const DEVICE_SECONDS = 60 * 60 * 24 * 365;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? process.env.COLLECTIVE_ADMIN_SESSION_SECRET;
  if (value) return `device:${value}`;
  if (process.env.NODE_ENV !== "production") return "device:local-dev-secret";
  throw new Error("ADMIN_SESSION_SECRET must be configured.");
}

const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("hex").slice(0, 32);

/** The device id inside a token, if the token is genuine. */
export function readDeviceToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const [id, signature] = token.split(".");
  if (!id || !signature || !/^[a-f0-9]{32}$/.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return id;
}

export function newDeviceToken() {
  const id = randomBytes(16).toString("hex");
  return `${id}.${sign(id)}`;
}

/** The device id from the cookie, or from a token the page kept. */
export async function currentDevice(hint?: unknown): Promise<{ id: string; token: string } | null> {
  const cookieStore = await cookies();
  for (const token of [cookieStore.get(DEVICE_COOKIE)?.value, hint]) {
    const id = readDeviceToken(token);
    if (id) return { id, token: token as string };
  }
  return null;
}

/** Same as currentDevice, but makes one (and remembers it) when there's none. */
export async function ensureDevice(hint?: unknown): Promise<{ id: string; token: string }> {
  const device = (await currentDevice(hint)) ?? (() => {
    const token = newDeviceToken();
    return { id: token.split(".")[0], token };
  })();
  const cookieStore = await cookies();
  if (cookieStore.get(DEVICE_COOKIE)?.value !== device.token) {
    cookieStore.set(DEVICE_COOKIE, device.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEVICE_SECONDS,
    });
  }
  return device;
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "").slice(0, 64) || null;
}
