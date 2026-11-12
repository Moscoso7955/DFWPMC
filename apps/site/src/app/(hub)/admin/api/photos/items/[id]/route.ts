import { hasAdminSession } from "@/lib/adminAuth";
import { SHARED_REVIEW, setPhotoMark, setPhotoStar } from "@/lib/photoStore";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { mark?: unknown; star?: unknown };
  if (body.mark === "pass" || body.mark === "fail" || body.mark === null) {
    await setPhotoMark(id, SHARED_REVIEW, body.mark);
    return Response.json({ ok: true });
  }
  if (typeof body.star === "boolean") {
    await setPhotoStar(id, SHARED_REVIEW, body.star);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Nothing to change." }, { status: 400 });
}
