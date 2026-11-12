import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contributorForEmail, getContributor, type Contributor } from "./photoStore";

// Upload-only logins for photographers. Separate cookie from admin, and the
// session is re-checked against the database so turning a contributor off
// takes effect immediately.

export const CONTRIBUTOR_SESSION_COOKIE = "pm_contributor_session";
export const CONTRIBUTOR_SESSION_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? process.env.COLLECTIVE_ADMIN_SESSION_SECRET;
  if (value) return `contributor:${value}`;
  if (process.env.NODE_ENV !== "production") return "contributor:local-dev-secret";
  throw new Error("ADMIN_SESSION_SECRET must be configured.");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createContributorSessionValue(contributorId: string) {
  const expires = Date.now() + CONTRIBUTOR_SESSION_SECONDS * 1000;
  const payload = `${contributorId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readSessionValue(value?: string): string | null {
  if (!value) return null;
  const [id, expires, signature] = value.split(".");
  if (!id || !expires || !signature) return null;
  if (Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return id;
}

export async function getContributorSession(): Promise<Contributor | null> {
  // Signed in with Google and allowed to upload: upload as yourself.
  const { getPrincipal } = await import("./session");
  const principal = await getPrincipal();
  if (principal?.kind === "user" && principal.areas.has("photo_upload") && principal.user.email) {
    return contributorForEmail(principal.user.email, principal.user.name).catch(() => null);
  }
  // Old upload logins work until the passwords are retired.
  const { passwordsRetired } = await import("./accessStore");
  if (await passwordsRetired()) return null;
  const cookieStore = await cookies();
  const id = readSessionValue(cookieStore.get(CONTRIBUTOR_SESSION_COOKIE)?.value);
  if (!id) return null;
  const contributor = await getContributor(id).catch(() => null);
  return contributor?.active ? contributor : null;
}

export async function requireContributor(): Promise<Contributor> {
  const contributor = await getContributorSession();
  if (!contributor) {
    const { passwordsRetired } = await import("./accessStore");
    redirect((await passwordsRetired()) ? "/admin/login?next=/upload" : "/upload/login");
  }
  return contributor;
}
