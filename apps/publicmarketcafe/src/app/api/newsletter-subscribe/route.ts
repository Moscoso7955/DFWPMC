import { addSubscriber } from "@/lib/subscribersStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; email?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (name.length < 1) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const result = await addSubscriber(email, "newsletter", name);
  return Response.json({ ok: true, added: result.added });
}
