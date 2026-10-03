import { isMenuClickTarget, recordMenuClick } from "@/lib/menuClicksStore";

export async function POST(request: Request) {
  let body: { target?: unknown; source?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!isMenuClickTarget(body.target)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const source = typeof body.source === "string" && body.source.length <= 32 ? body.source : "bottom";

  try {
    await recordMenuClick(body.target, source);
  } catch {
    // Swallow — tracking failures shouldn't break navigation.
  }

  return Response.json({ ok: true });
}
