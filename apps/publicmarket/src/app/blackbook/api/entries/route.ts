import { hasBlackbookAdminSession, hasBlackbookSession } from "@/lib/blackbookAuth";
import {
  createBlackbookEntry,
  isBlackbookStatus,
  listBlackbookEntries,
} from "@/lib/blackbookStore";

export async function GET() {
  if (!(await hasBlackbookSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await listBlackbookEntries();
  return Response.json({ entries });
}

export async function POST(request: Request) {
  if (!(await hasBlackbookAdminSession())) {
    return Response.json({ error: "Read-only access" }, { status: 403 });
  }

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

  const entry = await createBlackbookEntry({ name, photoUrl, notes, status });
  return Response.json({ ok: true, entry });
}
