import { Resend } from "resend";

const TO_EMAIL = "info@barphoebe.com";

export async function sendContactNotification(name: string, submitterEmail: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true as const, reason: "RESEND_API_KEY not set" };

  const from = process.env.RESEND_FROM_EMAIL ?? "Bar Phoebe Contact <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  const body = message ? `Name: ${name}\nEmail: ${submitterEmail}\n\n${message}` : `Name: ${name}\nEmail: ${submitterEmail}`;
  const { error } = await resend.emails.send({
    from,
    to: TO_EMAIL,
    replyTo: submitterEmail,
    subject: `New contact form submission from ${name}`,
    text: body,
  });

  if (error) {
    return { skipped: false as const, ok: false as const, error: error.message };
  }
  return { skipped: false as const, ok: true as const };
}
