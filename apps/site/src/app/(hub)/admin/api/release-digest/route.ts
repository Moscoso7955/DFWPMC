import { hasAdminSession } from "@/lib/adminAuth";
import { renderDigest, sendTestDigest } from "@/lib/releaseDigest";
import { RELEASE_NOTES } from "@/lib/releaseNotes";

// GET: preview the newest note as the email looks. POST: send that
// preview to Christian only.

export async function GET() {
  if (!(await hasAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { subject, html } = renderDigest(RELEASE_NOTES.slice(0, 1));
  return new Response(html.replace("<body", `<body data-subject="${subject.replace(/"/g, "&quot;")}"`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST() {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ ok: true, subject: await sendTestDigest() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
