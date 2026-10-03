// Minimal RFC 5545 iCalendar builder — small enough that pulling in
// a full iCal library isn't worth it, but strict enough that Apple
// Calendar, Google Calendar and Outlook all accept it. Uses CRLF
// line endings per §3.1 and folds long lines conservatively.

function foldLine(line: string): string {
  const bytes = line;
  if (bytes.length <= 75) return bytes;
  // Fold at 75 octets with a space continuation per §3.1.
  const folded: string[] = [];
  let remaining = bytes;
  while (remaining.length > 75) {
    folded.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
  }
  folded.push(remaining);
  return folded.join("\r\n ");
}

function toUtcStamp(iso: string): string {
  // ...basic date-time UTC form: 19980118T230000Z
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildEventIcs(input: {
  uid: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  url: string;
}): string {
  const now = new Date().toISOString();
  const dtstart = toUtcStamp(input.startsAt);
  const dtend = toUtcStamp(input.endsAt ?? new Date(new Date(input.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Public Market Cafe & Goods//Ticketing//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `LOCATION:${escapeText(input.location)}`,
    `URL:${escapeText(input.url)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
