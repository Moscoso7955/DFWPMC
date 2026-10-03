import { hasBlackbookAdminSession } from "@/lib/blackbookAuth";
import {
  deleteBlackbookEntry,
  isBlackbookStatus,
  updateBlackbookEntry,
} from "@/lib/blackbookStore";

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext) {
  const { id } = await context.params;
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const id = await parseId(context);
  if (id === null) return Response.json({ error: "Invalid id" }, { status: 400 });

  let body: { name?: unknown; photoUrl?: unknown; notes?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes : "";
  const status = isBlackbookStatus(body.status) ? body.status : "vip";

  if (name.length < 1) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const entry = await updateBlackbookEntry(id, { name, photoUrl, notes, status });
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

  const id = await parseId(context);
  if (id === null) return Response.json({ error: "Invalid id" }, { status: 400 });

  await deleteBlackbookEntry(id);
  return Response.json({ ok: true });
}
