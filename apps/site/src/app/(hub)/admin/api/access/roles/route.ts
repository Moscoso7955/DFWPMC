import { createRole } from "@/lib/accessStore";
import { accessActor } from "../guard";

export async function POST(request: Request) {
  if (!(await accessActor())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = (await request.json().catch(() => ({}))) as { name?: unknown };
  const result = await createRole(typeof name === "string" ? name : "");
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
