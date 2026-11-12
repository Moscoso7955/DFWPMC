import { sql } from "@vercel/postgres";
import { RELEASE_NOTES, type ReleaseNote, type ReleaseShot } from "./releaseNotes";
import { C, MONO, SANS, SITE, emailShell, esc, sendEach, type VenueEmail } from "./venueEmail";
import { listUpdateRecipients, listUsers, ownerEmail } from "./accessStore";

// The morning-after feature digest. An hourly cron calls sendDueDigest();
// at 8 AM Kansas City time it emails every note shipped before today that
// hasn't gone out yet (looking back a week at most). Nothing new, no email.
// It goes to everyone with "Update emails" on in Settings → People, one
// copy each, greeted by first name.

const TZ = "America/Chicago";
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = sql`
    create table if not exists release_digest_sent (
      note_id text primary key,
      sent_at timestamptz not null default now()
    )
  `
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

const chicagoDay = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: TZ });

/** Shipped before today (Kansas City), within the last week. */
function shippedNotes(now: number): ReleaseNote[] {
  const today = chicagoDay(now);
  return RELEASE_NOTES.filter((n) => {
    const t = Date.parse(n.shippedAt);
    return chicagoDay(t) < today && now - t <= LOOKBACK_MS;
  }).sort((a, b) => a.shippedAt.localeCompare(b.shippedAt));
}

export function renderDigest(notes: ReleaseNote[], name: string = "there", now = Date.now()) {
  const day = new Date(now).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  const subject = `New at Phoebe 🎉 ${notes.map((n) => n.title).join(" + ")}`;
  const greeting = `Hey ${name}!`;
  const lead =
    notes.length === 1
      ? "A new feature just shipped on barphoebe.com, and it's a good one. Let me show you what's new, how to hype it, and what to keep an eye on."
      : `${notes.length} new features just shipped on barphoebe.com! Let me show you what's new, how to hype each one, and what to keep an eye on.`;

  const label = (text: string, color = C.red) =>
    `<p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${color}">${esc(text)}</p>`;
  const bullets = (items: string[]) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items
      .map(
        (item) => `<tr><td valign="top" style="width:18px;padding:7px 0 0"><div style="width:8px;height:8px;background:${C.red}"></div></td>
        <td style="padding:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${esc(item)}</td></tr>`,
      )
      .join("")}</table>`;
  const img = (s: ReleaseShot, width: number) =>
    `<img src="${SITE}${s.src}" width="${width}" alt="${esc(s.caption)}" style="display:block;width:100%;max-width:${width}px;height:auto;border:3px solid ${C.red};background:${C.white}">
     <p style="margin:6px 0 0;font-family:${MONO};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">${esc(s.caption)}</p>`;
  const shots = (list: ReleaseShot[] = []) => {
    const phones = list.filter((s) => s.kind === "phone");
    const wide = list.filter((s) => s.kind === "wide");
    const rows: string[] = [];
    for (let i = 0; i < phones.length; i += 2) {
      const pair = phones.slice(i, i + 2);
      rows.push(`<tr>${pair
        .map((s, j) => `<td valign="top" width="50%" style="padding:0 ${j === 0 ? "8px" : "0"} 18px ${j === 1 ? "8px" : "0"}">${img(s, 262)}</td>`)
        .join("")}${pair.length === 1 ? '<td width="50%"></td>' : ""}</tr>`);
    }
    for (const s of wide) rows.push(`<tr><td colspan="2" style="padding:0 0 18px">${img(s, 540)}</td></tr>`);
    return rows.length ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 0">${rows.join("")}</table>` : "";
  };
  const examples = (list: string[] = []) =>
    list
      .map(
        (e) => `<div style="margin:0 0 10px;padding:12px 14px;background:${C.yellow};border-left:4px solid ${C.red};font-family:${SANS};font-size:14px;line-height:1.5;color:${C.ink}">${esc(e)}</div>`,
      )
      .join("");

  const noteHtml = (n: ReleaseNote) => `
    <tr><td style="padding:28px 28px 0">
      <div style="padding:20px 22px;background:${C.yellow};border:3px solid ${C.red}">
        <span style="display:inline-block;margin:0 0 10px;padding:3px 8px;background:${C.red};color:${C.cream};font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase">Just shipped ✨</span>
        <h1 style="margin:0 0 8px;font-family:${MONO};font-size:22px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">${esc(n.title)}</h1>
        <p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.5;color:${C.ink}"><strong>${esc(n.hook)}</strong></p>
      </div>
      <p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink}">${esc(n.whatItIs)}</p>
      <div style="margin:18px 0 0;padding:14px 16px 6px;background:${C.white};border:1px solid ${C.red}">
        ${label("Where to find it")}${bullets(n.where)}
      </div>
    </td></tr>
    ${n.sections
      .map(
        (sec) => `<tr><td style="padding:30px 28px 0">
      <h2 style="margin:0 0 12px;padding:0 0 8px;border-bottom:3px solid ${C.red};font-family:${MONO};font-size:16px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:${C.red}">${esc(sec.heading)}</h2>
      ${sec.intro ? `<p style="margin:0 0 12px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${esc(sec.intro)}</p>` : ""}
      ${bullets(sec.points)}
      ${sec.examples?.length ? `<div style="margin:8px 0 0">${label("Steal this copy")}${examples(sec.examples)}</div>` : ""}
      ${shots(sec.shots)}
    </td></tr>`,
      )
      .join("")}`;

  const html = emailShell({
    title: subject,
    kicker: `Fresh off the bar · ${day}`,
    greeting,
    lead,
    rows: notes.map(noteHtml).join(`<tr><td style="padding:34px 28px 0"><div style="border-top:3px solid ${C.red}"></div></td></tr>`),
    footer: "Questions or ideas? Just hit reply. Cheers! 🍸",
  });

  const text = [
    greeting,
    lead,
    ...notes.map((n) =>
      [
        `\n${n.title.toUpperCase()}`,
        n.hook,
        n.whatItIs,
        `\nWhere to find it\n${n.where.map((w) => `- ${w}`).join("\n")}`,
        ...n.sections.map((sec) =>
          [
            `\n${sec.heading}`,
            sec.intro ?? "",
            sec.points.map((p) => `- ${p}`).join("\n"),
            sec.examples?.length ? `Steal this copy:\n${sec.examples.map((e) => `  ${e}`).join("\n")}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
    ),
    "\nQuestions or ideas? Just hit reply. Cheers!",
  ].join("\n");

  return { subject, html, text } satisfies VenueEmail;
}

export type DigestResult =
  | { sent: true; subject: string; notes: string[]; to: number }
  | { sent: false; reason: string };

/** Emails notes shipped before today that haven't gone out. Safe to call repeatedly. */
export async function sendDueDigest(now = Date.now()): Promise<DigestResult> {
  const candidates = shippedNotes(now);
  if (candidates.length === 0) return { sent: false, reason: "Nothing shipped." };
  // Nobody switched on: keep the notes unsent so they go out (within the
  // week) once someone is.
  const recipients = await listUpdateRecipients();
  if (recipients.length === 0) return { sent: false, reason: "No one has update emails on." };
  await ensureSchema();
  // Claim the notes first so overlapping runs can't double-send.
  const claimed: ReleaseNote[] = [];
  for (const note of candidates) {
    const { rows } = await sql`insert into release_digest_sent (note_id) values (${note.id}) on conflict do nothing returning note_id`;
    if (rows[0]) claimed.push(note);
  }
  if (claimed.length === 0) return { sent: false, reason: "Already sent." };
  const subject = renderDigest(claimed, recipients[0].name, now).subject;
  try {
    await sendEach(recipients, (name) => renderDigest(claimed, name, now));
  } catch (error) {
    for (const note of claimed) await sql`delete from release_digest_sent where note_id = ${note.id}`;
    throw error;
  }
  return { sent: true, subject, notes: claimed.map((n) => n.id), to: recipients.length };
}

/** The newest note, emailed to the Admin only, to check how it looks. */
export async function sendTestDigest(): Promise<string> {
  const to = ownerEmail() || (process.env.ADMIN_EMAIL ?? "");
  if (!to) throw new Error("ADMIN_EMAIL is not configured.");
  const owner = (await listUsers()).find((u) => u.isOwner);
  const name = owner?.name.trim().split(/\s+/)[0] || "there";
  const notes = RELEASE_NOTES.slice(0, 1);
  await sendEach([{ name, email: to }], (name) => {
    const email = renderDigest(notes, name);
    return { ...email, subject: `[Test] ${email.subject}` };
  });
  return renderDigest(notes).subject;
}
