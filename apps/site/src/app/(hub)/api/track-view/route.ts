import { pageKey, recordPageView } from "@/lib/pageViewsStore";

// One guest page view (see PageViewTracker). Bots and unknown pages are
// ignored; failures never affect the visitor.
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse/i;

export async function POST(request: Request) {
  if (BOTS.test(request.headers.get("user-agent") ?? "")) return Response.json({ ok: true });
  let body: { path?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const page = pageKey(body.path);
  if (!page) return Response.json({ ok: false }, { status: 400 });
  try {
    await recordPageView(page);
  } catch {
    // Tracking failures shouldn't break anything.
  }
  return Response.json({ ok: true });
}
