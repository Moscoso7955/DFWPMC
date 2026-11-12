import { hasAdminSession } from "@/lib/adminAuth";
import { renderUploadAlert, sendTestUploadAlert } from "@/lib/photoAlerts";
import { getUploadForPreview } from "@/lib/photoStore";

// GET: the "new photos to review" email for a night (?night=<id>, or the
// most recently uploaded one), exactly as Victoria and Chloe would get it.
// POST: send that preview to Christian only.

async function load(request: Request) {
  const night = new URL(request.url).searchParams.get("night") ?? undefined;
  return getUploadForPreview(night && /^[0-9a-f-]{36}$/i.test(night) ? night : undefined);
}

export async function GET(request: Request) {
  if (!(await hasAdminSession())) return new Response("Unauthorized", { status: 401 });
  const upload = await load(request);
  if (!upload) return new Response("No uploaded photos yet.", { status: 404 });
  return new Response(renderUploadAlert(upload).html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const upload = await load(request);
  if (!upload) return Response.json({ error: "No uploaded photos yet." }, { status: 404 });
  try {
    return Response.json({ ok: true, subject: await sendTestUploadAlert(upload) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
