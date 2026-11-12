import { C, MONO, SANS, SITE, emailButton, emailShell, esc, sendEach } from "@/lib/venueEmail";
import { cacheGet, cacheSet, opexIssues } from "@/lib/opexStore";

// After each operating-costs refresh: if the self-check finds a problem
// (a service that stopped answering, missing days in the hosting bill),
// email the Admin, at most once a day while it lasts. When the problems
// clear, the next one emails right away.

const DAY = 24 * 3_600_000;

export function renderCostAlert(issues: string[]) {
  const link = `${SITE}/admin/analytics`;
  const subject = issues.length === 1 ? "Operating costs: 1 thing to check" : `Operating costs: ${issues.length} things to check`;
  const lead = "The operating costs check on the website found something that doesn't add up:";
  const items = issues
    .map((i) => `<li style="margin:0 0 8px">${esc(i)}</li>`)
    .join("");
  const rows = `
  <tr><td style="padding:16px 28px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">
    <ul style="margin:0;padding:0 0 0 20px">${items}</ul>
  </td></tr>
  <tr><td style="padding:18px 28px 0">${emailButton(link, "Open Analytics")}</td></tr>
  <tr><td style="padding:16px 28px 0;font-family:${MONO};font-size:12px;line-height:1.6;color:${C.ink}">
    Press Refresh on the Operating costs card once it's sorted. While a problem lasts you'll get this at most once a day.
  </td></tr>`;
  const html = emailShell({ title: subject, kicker: "Operating costs check", greeting: "Heads up", lead, rows, footer: "The website's cost check" });
  const text = ["Heads up", lead, "", ...issues.map((i) => `- ${i}`), "", `Open Analytics: ${link}`].join("\n");
  return { subject, html, text };
}

export async function checkCostsAndAlert(now = new Date()) {
  const issues = await opexIssues(now);
  if (!issues.length) {
    await cacheSet("alert_sent_at", null);
    return { issues, emailed: false };
  }
  const to = (process.env.ADMIN_EMAIL ?? "").trim();
  const last = (await cacheGet("alert_sent_at"))?.value;
  const lastAt = typeof last === "string" ? Date.parse(last) : NaN;
  if (!to || !process.env.RESEND_API_KEY || (Number.isFinite(lastAt) && now.getTime() - lastAt < DAY)) {
    return { issues, emailed: false };
  }
  await sendEach([{ name: "", email: to }], () => renderCostAlert(issues));
  await cacheSet("alert_sent_at", now.toISOString());
  return { issues, emailed: true };
}
