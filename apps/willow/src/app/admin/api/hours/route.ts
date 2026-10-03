import { hasAdminSession } from "@/lib/adminAuth";
import { isValidOperatingHours, updateDraftOperatingHours } from "@/lib/siteContent";

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { hours?: unknown };
  try {
    body = (await request.json()) as { hours?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidOperatingHours(body.hours)) {
    return Response.json({ error: "Invalid operating hours payload" }, { status: 400 });
  }

  const content = await updateDraftOperatingHours(body.hours);
  return Response.json({ ok: true, content });
}
