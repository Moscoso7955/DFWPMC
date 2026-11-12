// Wall-clock times in the venue's time zone, the same on the server and in
// the browser. (Using the device's own zone made server-rendered pages
// disagree with the browser, since the server runs on UTC.)

export const VENUE_TIME_ZONE = process.env.NEXT_PUBLIC_VENUE_TIME_ZONE ?? "America/Chicago";

const pad = (n: number) => String(n).padStart(2, "0");

function parts(ms: number, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

/** An instant as the venue's local "YYYY-MM-DDTHH:mm" (what the pickers use). */
export function isoToVenueLocal(iso: string | null, timeZone = VENUE_TIME_ZONE): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const p = parts(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour % 24)}:${pad(p.minute)}`;
}

/** The venue's local "YYYY-MM-DDTHH:mm" back to an ISO instant. */
export function venueLocalToIso(value: string, timeZone = VENUE_TIME_ZONE): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  // The zone's offset at that moment, found by formatting a guess; twice for DST edges.
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = parts(guess, timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
    guess = guess - (shown - wall);
  }
  return new Date(guess).toISOString();
}
