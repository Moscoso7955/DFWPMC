import { hasAdminSession } from "@/lib/adminAuth";
import { isUploadedAssetUrl } from "@/lib/adminFiles";
import { isStoryContentField, updateDraftStoryField } from "@/lib/siteContent";

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; value?: unknown };

  if (!isStoryContentField(body.field) || typeof body.value !== "string") {
    return Response.json({ error: "Invalid story draft update" }, { status: 400 });
  }

  if (body.field === "copy" && body.value.trim().length < 1) {
    return Response.json({ error: "Invalid story copy" }, { status: 400 });
  }

  if (body.field !== "copy" && !isUploadedAssetUrl(body.value)) {
    return Response.json({ error: "Invalid story image" }, { status: 400 });
  }

  const content = await updateDraftStoryField(body.field, body.value);
  return Response.json({ ok: true, content });
}
