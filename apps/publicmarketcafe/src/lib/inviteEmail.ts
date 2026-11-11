import { AREAS, type Role, type VenueUser } from "./accessShared";
import { C, MONO, SANS, SITE, emailButton, emailShell, esc, sendEmail, type VenueEmail } from "./venueEmail";
import { INVITE_DAYS } from "./accessStore";
import { venue } from "./venue";

// The "you're invited" email: what they'll have access to and the
// sign-in-with-Google link.

export function renderInvite(user: VenueUser, roles: Role[], link: string, invitedBy: string): VenueEmail {
  const theirs = roles.filter((r) => user.roles.includes(r.id));
  const roleNames = theirs.map((r) => r.name).join(" + ") || "No access yet";
  const first = user.name.split(/\s+/)[0] || user.name;
  const subject = `You're invited to ${venue.name} admin`;
  const lines = theirs.map((r) => {
    const areas = AREAS.filter((a) => r.areas.includes(a.id)).map((a) => a.label);
    return `<p style="margin:0 0 10px"><strong>${esc(r.name)}:</strong> ${esc(areas.join(", ") || "nothing yet")}.</p>`;
  });
  const rows = `
    <tr><td style="padding:24px 28px 0">
      <div style="padding:20px 22px;background:${C.yellow};border:3px solid ${C.red}">
        <span style="display:inline-block;margin:0 0 10px;padding:3px 8px;background:${C.red};color:${C.cream};font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase">You're invited</span>
        <h1 style="margin:0 0 6px;font-family:${MONO};font-size:22px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">${esc(venue.name)} admin</h1>
        <p style="margin:0;font-family:${SANS};font-size:15px;color:${C.ink}"><strong>Your access: ${esc(roleNames)}</strong></p>
      </div>
    </td></tr>
    <tr><td style="padding:22px 28px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">
      ${lines.join("")}
      <div style="margin:18px 0 0">${emailButton(link, "Sign in with Google \u2192")}</div>
      <p style="margin:14px 0 0;font-size:13px;color:#6b6460">Use the Google account for <strong>${esc(user.email)}</strong>. This link works for ${INVITE_DAYS} days. Wasn't expecting this? You can ignore it.</p>
    </td></tr>`;
  const html = emailShell({
    title: subject,
    kicker: `${venue.name} \u00b7 admin invite`,
    greeting: `Hey ${first}!`,
    lead: `${invitedBy} invited you to ${venue.name}'s admin. Sign in with Google to get started.`,
    rows,
    footer: "Questions? Just reply to this email.",
  });
  const text = [
    `Hey ${first}!`,
    `${invitedBy} invited you to ${venue.name}'s admin (${roleNames}).`,
    `Sign in with Google (use ${user.email}): ${link}`,
    `This link works for ${INVITE_DAYS} days.`,
  ].join("\n\n");
  return { subject, html, text };
}

export async function sendInvite(user: VenueUser, roles: Role[], token: string, invitedBy: string) {
  const email = renderInvite(user, roles, `${SITE}/auth/invite/${token}`, invitedBy);
  await sendEmail({ ...email, to: [user.email] });
}
