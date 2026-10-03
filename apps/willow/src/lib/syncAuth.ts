import { timingSafeEqual } from "node:crypto";

// Bearer auth for the mailing-list sync API. One shared secret,
// MAILING_LIST_SYNC_TOKEN, set here and on the CallidusCo mailing app.
// Constant-time compare; an unset token rejects everything.
export function hasSyncAuth(request: Request): boolean {
  const token = process.env.MAILING_LIST_SYNC_TOKEN ?? "";
  if (!token) return false;
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return false;
  const presented = Buffer.from(match[1]);
  const expected = Buffer.from(token);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
