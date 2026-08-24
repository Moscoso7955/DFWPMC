const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The mailing list lives in the CallidusCo Owner Portal (this site has
// no database) — signups forward there server-side, authenticated by
// MAILING_LIST_SYNC_TOKEN. See docs/mailing-list.md.
const MAIL_SIGNUP_URL =
  process.env.MAILING_LIST_API_URL ??
  "https://ofliuuulagqlbdjwrnjc.supabase.co/functions/v1/mail-signup";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const token = process.env.MAILING_LIST_SYNC_TOKEN;
  if (!token) {
    return Response.json({ error: "Signups aren't configured yet." }, { status: 503 });
  }

  try {
    const res = await fetch(MAIL_SIGNUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, source: "website" }),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
  } catch {
    return Response.json({ error: "Couldn't save your signup — please try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
