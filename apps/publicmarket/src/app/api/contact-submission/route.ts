import { sendContactNotification } from "@/lib/contactNotifier";
import { insertContactSubmission } from "@/lib/contactSubmissionsStore";
import { addSubscriber } from "@/lib/subscribersStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; email?: unknown; message?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 1) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (message.length > 5000) {
    return Response.json({ error: "Message is too long." }, { status: 400 });
  }

  await insertContactSubmission(name, email, message);
  await addSubscriber(email, "contact_form");
  const notification = await sendContactNotification(name, email, message);

  return Response.json({ ok: true, notification });
}
