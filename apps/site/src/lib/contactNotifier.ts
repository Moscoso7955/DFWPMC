import { LOCAL_PREVIEW, type VenueConfig } from "./venues";
import { Resend } from "resend";

const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "";

export async function sendContactNotification(venue: VenueConfig, name: string, submitterEmail: string, message: string) {
  if (LOCAL_PREVIEW) return { skipped: true as const, reason: "Local preview — email is not connected." };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !TO_EMAIL) return { skipped: true as const, reason: "RESEND_API_KEY not set" };

  const from = process.env.RESEND_FROM_EMAIL ?? `${venue.name} Contact <updates@fwpublicmarket.com>`;
  const resend = new Resend(apiKey);

  const body = message ? `Name: ${name}\nEmail: ${submitterEmail}\n\n${message}` : `Name: ${name}\nEmail: ${submitterEmail}`;
  const { error } = await resend.emails.send({
    from,
    to: TO_EMAIL,
    replyTo: submitterEmail,
    subject: `[${venue.name}] New contact form submission from ${name}`,
    text: body,
  });

  if (error) {
    return { skipped: false as const, ok: false as const, error: error.message };
  }
  return { skipped: false as const, ok: true as const };
}
