import { addSubscriber } from "@/lib/subscribersStore";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  if (!process.env.POSTGRES_URL) {
    return Response.json({ error: "Email signups are temporarily unavailable. Please try again later." }, { status: 503 });
  }
  try {
    const result = await addSubscriber(email, "newsletter");
    return Response.json({ ok: true, added: result.added });
  } catch {
    return Response.json({ error: "We couldn’t save your signup. Please try again later." }, { status: 503 });
  }
}
