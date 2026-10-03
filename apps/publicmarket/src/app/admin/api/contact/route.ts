import { hasAdminSession } from "@/lib/adminAuth";
import { isContactContentField, updateDraftContactField } from "@/lib/siteContent";

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { field?: unknown; value?: unknown };

  if (!isContactContentField(body.field) || typeof body.value !== "string") {
    return Response.json({ error: "Invalid contact draft update" }, { status: 400 });
  }

  const value = body.value.trim();

  if (body.field !== "instagram" && body.field !== "instagramLabel" && value.length < 1) {
    return Response.json({ error: "Invalid contact value" }, { status: 400 });
  }

  if (body.field === "email" && !value.includes("@")) {
    return Response.json({ error: "Invalid contact email" }, { status: 400 });
  }

  const content = await updateDraftContactField(body.field, value);
  return Response.json({ ok: true, content });
}
