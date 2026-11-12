import { hasAdminSession } from "@/lib/adminAuth";
import { resetContributorPassword, setContributorActive } from "@/lib/photoStore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { active?: unknown; resetPassword?: unknown };
  if (typeof body.active === "boolean") {
    await setContributorActive(id, body.active);
    return Response.json({ ok: true });
  }
  if (body.resetPassword === true) {
    const password = await resetContributorPassword(id);
    if (!password) return Response.json({ error: "Contributor not found." }, { status: 404 });
    return Response.json({ ok: true, password });
  }
  return Response.json({ error: "Nothing to change." }, { status: 400 });
}
