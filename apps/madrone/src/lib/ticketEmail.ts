import { venue } from "./venue";
import { Resend } from "resend";
import { getSiteUrl } from "./stripe";
import { buildEventIcs } from "./icsCalendar";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "./wallet/config";
import type {
  Ticket,
  TicketedEvent,
  TicketingSettings,
} from "./ticketingTypes";

const FROM_ADDRESS = process.env.TICKET_EMAIL_FROM ?? "Madrone <venue-tickets@example.invalid>";

let cached: Resend | null = null;
function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const AGE_LABEL = {
  "21+": "21 and over — valid photo ID required at the door",
  "18+": "18 and over — valid photo ID required at the door",
  all_ages: "All ages",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Order-level wallet buttons at the top of the email: one tap adds
// every ticket in the order. Each shows only when its credentials are
// configured.
function walletButtons(siteUrl: string, orderId: string): string {
  const buttons: string[] = [];
  if (isAppleWalletConfigured()) {
    buttons.push(`
          <a href="${siteUrl}/api/ticketing/orders/${orderId}/wallet/apple"
            style="display:inline-block;margin:4px;padding:12px 22px;background:#000000;color:#ffffff;border-radius:8px;text-decoration:none;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">
            Add to Apple Wallet
          </a>`);
  }
  if (isGoogleWalletConfigured()) {
    buttons.push(`
          <a href="${siteUrl}/api/ticketing/orders/${orderId}/wallet/google"
            style="display:inline-block;margin:4px;padding:12px 22px;background:#1f1f1f;color:#ffffff;border-radius:8px;text-decoration:none;font-family:Roboto,Arial,sans-serif;font-size:15px;font-weight:500;">
            Add to Google Wallet
          </a>`);
  }
  if (buttons.length === 0) return "";
  return `
    <tr>
      <td align="center" style="padding:18px 28px 0;">${buttons.join("")}
      </td>
    </tr>`;
}

function ticketBlock(ticket: Ticket, siteUrl: string): string {
  // Reference the QR image at a stable public URL rather than a
  // data: URI — Gmail (and most other clients) strip inline data
  // URIs, which is why the previous email rendered an empty
  // rectangle where the QR should be.
  const qrUrl = `${siteUrl}/t/${ticket.token}/qr.png`;
  return `
    <table cellpadding="0" cellspacing="0" role="presentation"
      style="width:100%;margin:0 0 16px;border:2px solid #740406;background:#f2f1eb;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <img src="${qrUrl}" alt="Scan at door" width="220" height="220"
            style="display:block;margin:0 auto;image-rendering:pixelated;" />
          <p style="margin:12px 0 4px;font-family:'Courier New',monospace;font-size:11px;color:#222020;letter-spacing:0.06em;text-transform:uppercase;">
            Ticket #${ticket.token.slice(0, 8).toUpperCase()}
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#740406;">
            <a href="${siteUrl}/t/${ticket.token}" style="color:#740406;text-decoration:underline;">
              Open on your phone
            </a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

function actionButtons(siteUrl: string, orderId: string): string {
  const calHref = `${siteUrl}/api/ticketing/orders/${orderId}/ical`;
  // Table layout for Gmail/Outlook compatibility. Wallet buttons live
  // per-ticket in ticketBlock() since each pass is one ticket.
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:4px 0 8px;">
      <tr>
        <td align="center" style="padding:0 0 8px;">
          <a href="${calHref}"
            style="display:inline-block;padding:12px 22px;background:#740406;color:#f2f1eb;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">
            Add to calendar
          </a>
        </td>
      </tr>
    </table>
  `;
}

export type SendTicketEmailInput = {
  event: TicketedEvent;
  order: {
    id: string;
    buyerEmail: string;
    buyerName: string;
    totalCents: number;
    subtotalCents: number;
    serviceFeeCents: number;
    taxCents: number;
  };
  tickets: Ticket[];
  settings: TicketingSettings | null;
  venueAddress?: string;
};

// Sends the confirmation with one inline QR per ticket + an .ics
// attachment for the event. Returns silently on missing config so a
// missing RESEND_API_KEY in preview environments doesn't blow up
// the webhook. Callers should log the return but not fail on false.

export async function sendTicketEmail(input: SendTicketEmailInput): Promise<boolean> {
  if (venue.localPreview) return false;

  const resend = getResend();
  if (!resend) return false;
  if (input.tickets.length === 0) return false;

  const siteUrl = getSiteUrl();
  const { event, order, tickets, settings } = input;
  const venueAddress = input.venueAddress ?? "Venue address to be added";

  const ticketBlocks = tickets.map((t) => ticketBlock(t, siteUrl)).join("\n");
  const actions = actionButtons(siteUrl, order.id);

  const ageLine = AGE_LABEL[event.ageRestriction];
  const doorsLine = event.doorsAt ? `Doors ${formatTime(event.doorsAt)} · ` : "";

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#222020;font-family:Arial,sans-serif;color:#222020;">
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#222020;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table cellpadding="0" cellspacing="0" role="presentation"
                style="width:100%;max-width:560px;background:#f2f1eb;border:3px solid #740406;">
                <tr>
                  <td style="padding:28px 28px 8px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#829ec3;">
                      You&rsquo;re in
                    </p>
                    <h1 style="margin:0;font-size:24px;letter-spacing:0.02em;text-transform:uppercase;color:#740406;">
                      ${escapeHtml(event.title)}
                    </h1>
                    <p style="margin:6px 0 0;font-size:15px;">${escapeHtml(formatDate(event.startsAt))}</p>
                    <p style="margin:2px 0 0;font-size:14px;color:#4d0304;">
                      ${doorsLine}Starts ${escapeHtml(formatTime(event.startsAt))}
                    </p>
                  </td>
                </tr>${walletButtons(siteUrl, order.id)}
                <tr>
                  <td style="padding:20px 28px 0;">
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">
                      Hi ${escapeHtml(order.buyerName.split(" ")[0])}, thanks for the order. Show the QR${tickets.length > 1 ? "s" : ""}
                      below at the door — on your phone or printed. ${escapeHtml(ageLine)}.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px;">
                    ${ticketBlocks}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px;">
                    ${actions}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 28px 0;">
                    <table cellpadding="0" cellspacing="0" role="presentation"
                      style="width:100%;font-size:13px;color:#222020;">
                      <tr>
                        <td>Subtotal</td>
                        <td align="right">$${(order.subtotalCents / 100).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Service fee</td>
                        <td align="right">$${(order.serviceFeeCents / 100).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Sales tax</td>
                        <td align="right">$${(order.taxCents / 100).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding-top:6px;border-top:1px solid #ccc;font-weight:600;color:#740406;">Total</td>
                        <td align="right" style="padding-top:6px;border-top:1px solid #ccc;font-weight:600;color:#740406;">
                          $${(order.totalCents / 100).toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 28px;font-size:12px;color:#4a4a4a;line-height:1.5;">
                    <p style="margin:0 0 8px;">
                      <strong>Where:</strong> Madrone · ${escapeHtml(venueAddress)}
                    </p>
                    ${
                      settings?.refundPolicyMd
                        ? `<p style="margin:0 0 8px;"><strong>Refund policy:</strong> ${escapeHtml(settings.refundPolicyMd.split("\n")[0])}</p>`
                        : ""
                    }
                    <p style="margin:0 0 8px;">
                      Questions? <a href="mailto:${settings?.supportEmail ?? "venue-contact@example.invalid"}" style="color:#740406;">
                        ${settings?.supportEmail ?? "venue-contact@example.invalid"}
                      </a>
                    </p>
                    <p style="margin:0;">
                      Venue ticketing terms to be added. ·
                      <a href="${siteUrl}/privacy" style="color:#740406;">Privacy</a> ·
                      <a href="${siteUrl}/terms" style="color:#740406;">Terms</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // The .ics goes out as a text/calendar attachment so Apple Mail and
  // Gmail show their native add-to-calendar prompt. Same UID as the
  // /ical route so adding from both doesn't create a duplicate. The QR
  // stays inline via /t/:token/qr.png, not attached.
  const ics = buildEventIcs({
    uid: `preview-order-${order.id}@madrone.local`,
    title: event.title,
    description: "Madrone · show QR at door.",
    location: `Madrone, ${venueAddress}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    url: `${siteUrl}/calendar/${event.slug}/confirmation?order=${order.id}`,
  });

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: order.buyerEmail,
      subject: `Your tickets — ${event.title}`,
      html,
      attachments: [
        {
          filename: `${event.slug}.ics`,
          content: Buffer.from(ics, "utf8"),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
