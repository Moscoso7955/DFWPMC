import { Resend } from "resend";
import { venue } from "./venue";

// Shared look and sending for the venue's own emails (invites, and later
// the feature digest and photo alerts): the venue's colors, its name in
// the header, plain tables that render everywhere.

const FROM = process.env.VENUE_EMAIL_FROM ?? `${venue.name} <updates@fwpublicmarket.com>`;
const REPLY_TO = process.env.VENUE_EMAIL_REPLY_TO ?? "christian@callidusco.com";

/** Links and images in the emails point at the venue's own site. */
export const SITE = `${venue.entryOrigin.replace(/\/+$/, "")}${venue.basePath}`;

// The venue's brand colors (venue.config.json), in the roles the Phoebe
// email template used its palette for.
export const C = {
  red: venue.brand.primary,
  cream: venue.brand.paper,
  yellow: venue.brand.accent,
  ink: venue.brand.ink,
  white: "#ffffff",
};
export const MONO = "'Roboto Mono',Menlo,Consolas,'Courier New',monospace";
export const SANS = "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The full HTML document: header, greeting, the body rows, footer. */
export function emailShell(input: { title: string; kicker: string; greeting: string; lead: string; rows: string; footer: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet"><title>${esc(input.title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${C.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:${C.cream};border:3px solid ${C.red}">
  <tr><td align="center" style="padding:26px 20px 18px;background:${C.red}">
    <p style="margin:0;font-family:${MONO};font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:${C.cream}">${esc(venue.name)}</p>
    <p style="margin:10px 0 0;font-family:${MONO};font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${C.cream}">${esc(input.kicker)}</p>
  </td></tr>
  <tr><td style="padding:26px 28px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">
    <p style="margin:0 0 6px;font-family:${MONO};font-size:20px;font-weight:500;letter-spacing:.04em;color:${C.red}">${esc(input.greeting)}</p>
    <p style="margin:0">${esc(input.lead)}</p>
  </td></tr>
  ${input.rows}
  <tr><td style="padding:34px 0 0"></td></tr>
  <tr><td align="center" style="padding:20px;background:${C.red}">
    <p style="margin:0 0 4px;font-family:${SANS};font-size:15px;color:${C.cream}">${esc(input.footer)}</p>
    <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.cream}">${esc(venue.name)} · Fort Worth Public Market</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** A big brand-color button, safe for email clients. */
export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.red}">
    <a href="${esc(href)}" style="display:inline-block;padding:15px 26px;font-family:${MONO};font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:${C.cream};text-decoration:none">${esc(label)}</a>
  </td></tr></table>`;
}

export type VenueEmail = { subject: string; html: string; text: string };

/** Each person gets their own copy, greeted by their own name. */
export async function sendEach(people: { name: string; email: string }[], render: (name: string) => VenueEmail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(key);
  for (const person of people) {
    const email = render(person.name);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [person.email],
      replyTo: REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) throw new Error(error.message);
  }
}

/** One email to specific people (invites, later Playbook reminders). */
export async function sendEmail(input: VenueEmail & { to: string[]; bcc?: string[] }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to: input.to,
    ...(input.bcc?.length ? { bcc: input.bcc } : {}),
    replyTo: REPLY_TO,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) throw new Error(error.message);
}
