import { hasAdminSession } from "@/lib/adminAuth";
import { addRow, isCollection } from "@/lib/playbookStore";
import { can } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; collection: string }> };

// Adds a task, budget line, supply, look-book photo, key date or run-of-show line.
export async function POST(request: Request, { params }: Ctx) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, collection } = await params;
  if (!isCollection(collection)) return Response.json({ error: "Not found" }, { status: 404 });
  if (collection === "budget" && !(await can("playbook_budget"))) return Response.json({ error: "No budget access." }, { status: 403 });
  const result = await addRow(id, collection, (await request.json().catch(() => ({}))) as Record<string, unknown>);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
