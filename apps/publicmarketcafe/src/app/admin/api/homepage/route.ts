import { hasAdminSession } from "@/lib/adminAuth";
import { isUploadedAssetUrl } from "@/lib/adminFiles";
import { isHomepageContentField, updateDraftHomepageField } from "@/lib/siteContent";

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; src?: unknown };

  if (!isHomepageContentField(body.field) || typeof body.src !== "string" || !isUploadedAssetUrl(body.src)) {
    return Response.json({ error: "Invalid homepage draft update" }, { status: 400 });
  }

  const content = await updateDraftHomepageField(body.field, body.src);
  return Response.json({ ok: true, content });
}
