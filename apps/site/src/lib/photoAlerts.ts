import { C, MONO, SANS, SITE, emailButton, emailShell, esc, sendEach, type VenueEmail } from "./venueEmail";

import { claimUploadAlert, listUploadsToAnnounce, releaseUploadAlert, type UploadToAnnounce } from "./photoStore";

// "New photos to review" emails for everyone with Photo alerts on in
// Settings → People. Each person gets their own copy, greeted by first
// name; the tips name the others on the list. A cron checks every 10
// minutes and sends one email per night once its upload has gone quiet;
// photos added to the same night later get a short "more photos" email.

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function renderUploadAlert(u: UploadToAnnounce, name: string = "there", others: string[] = []): VenueEmail {
  const when = dayLabel(u.date);
  const more = u.newCount < u.total;
  const count = `${u.newCount} ${more ? "more " : "new "}photo${u.newCount === 1 ? "" : "s"}`;
  const subject = `📸 ${count} to review: ${u.title} · ${when}`;
  const who = u.contest ? "The costume contest entries" : u.contributor ? `${u.contributor} just uploaded` : "Someone just uploaded";
  const lead = u.contest
    ? `${who} from ${u.title} (${when}) are in Market Nights and waiting for your yes or no. That's ${u.newCount} photo${u.newCount === 1 ? "" : "s"}.`
    : more
      ? `${who} ${count} to ${u.title} (${when}). They're waiting for your yes or no.`
      : `${who} ${count} from ${u.title} (${when}). They're waiting for your yes or no before anything goes live.`;
  const link = `${SITE}/admin/photos/${u.nightId}`;

  const thumbs = u.previews.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0 0">${[0, 3]
        .filter((start) => u.previews.length > start)
        .map(
          (start) =>
            `<tr>${[0, 1, 2]
              .map((k) => {
                const src = u.previews[start + k];
                return `<td width="33%" style="padding:0 ${k < 2 ? "6px" : "0"} 6px 0">${
                  src ? `<img src="${esc(src)}" width="176" alt="" style="display:block;width:100%;height:150px;object-fit:cover;border:3px solid ${C.red};background:${C.white}">` : ""
                }</td>`;
              })
              .join("")}</tr>`,
        )
        .join("")}</table>`
    : "";

  const partner = others.length ? others.join(" or ") : "anyone else on the team";
  const tips = [
    "On your phone it's one photo at a time: swipe right for yes, left for no, and double-tap to highlight a favorite (that counts as a yes).",
    u.published
      ? `This night is already live. The new photos go up as soon as ${others.length ? `you or ${partner}` : "you"} say${others.length ? "s" : ""} yes.`
      : others.length
        ? `You and ${partner} share one review, so whoever gets there first can do it. The night goes live once it's marked done, showing the photos that got a yes.`
        : "The night goes live once you mark the review done, showing the photos that got a yes.",
  ];

  const rows = `
    <tr><td style="padding:24px 28px 0">
      <div style="padding:18px 20px;background:${C.yellow};border:3px solid ${C.red}">
        <span style="display:inline-block;margin:0 0 8px;padding:3px 8px;background:${C.red};color:${C.cream};font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase">${more ? "More photos" : "Ready for review"}</span>
        <h1 style="margin:0 0 4px;font-family:${MONO};font-size:22px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${C.red}">${esc(u.title)}</h1>
        <p style="margin:0;font-family:${MONO};font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink}">${esc(when)} · ${u.newCount} ${more ? "new " : ""}photo${u.newCount === 1 ? "" : "s"}${u.contributor ? ` · by ${esc(u.contributor)}` : ""}</p>
      </div>
      ${thumbs}
      <div style="margin:20px 0 0">${emailButton(link, "Start reviewing →")}</div>
    </td></tr>
    <tr><td style="padding:26px 28px 0">
      <p style="margin:0 0 10px;font-family:${MONO};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${C.red}">Quick reminder</p>
      ${tips.map((t) => `<p style="margin:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${esc(t)}</p>`).join("")}
    </td></tr>`;

  const html = emailShell({
    title: subject,
    kicker: "New photos in Market Nights",
    greeting: `Hey ${name}!`,
    lead,
    rows,
    footer: "Happy reviewing! 📸",
  });
  const text = [`Hey ${name}!`, lead, `\nStart reviewing: ${link}`, "", ...tips].join("\n");
  return { subject, html, text };
}

export type UploadAlertResult = { sent: string[]; skipped: number };

/** Emails every night whose new photos have settled. Safe to call repeatedly. */
export async function sendDueUploadAlerts(): Promise<UploadAlertResult> {
  const due = await listUploadsToAnnounce();
  const sent: string[] = [];
  let skipped = 0;
  for (const upload of due) {
    const claim = await claimUploadAlert(upload.nightId, upload.through);
    if (!claim.ok) {
      skipped++;
      continue;
    }
    try {
      const { listPhotoAlertRecipients } = await import("./accessStore");
      const people = await listPhotoAlertRecipients();
      if (people.length === 0) {
        await releaseUploadAlert(upload.nightId, claim.previous);
        skipped++;
        continue;
      }
      await sendEach(people, (name) => renderUploadAlert(upload, name, people.filter((x) => x.name !== name).map((x) => x.name)));
      sent.push(renderUploadAlert(upload).subject);
    } catch (error) {
      await releaseUploadAlert(upload.nightId, claim.previous);
      throw error;
    }
  }
  return { sent, skipped };
}

/** One night's alert, emailed to the Admin only. */
export async function sendTestUploadAlert(upload: UploadToAnnounce) {
  const { ownerEmail, listUsers } = await import("./accessStore");
  const to = ownerEmail() || (process.env.ADMIN_EMAIL ?? "");
  if (!to) throw new Error("ADMIN_EMAIL is not configured.");
  const owner = (await listUsers()).find((u) => u.isOwner);
  const name = owner?.name.trim().split(/\s+/)[0] || "there";
  await sendEach([{ name, email: to }], (name) => {
    const email = renderUploadAlert(upload, name);
    return { ...email, subject: `[Test] ${email.subject}` };
  });
  return renderUploadAlert(upload).subject;
}
