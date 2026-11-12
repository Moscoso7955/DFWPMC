import { hasAdminSession } from "@/lib/adminAuth";
import { createContributor } from "@/lib/photoStore";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a name and a valid email." }, { status: 400 });
  }
  try {
    const { contributor, password } = await createContributor(name, email);
    return Response.json({ contributor, password });
  } catch {
    return Response.json({ error: "That email already has a login." }, { status: 409 });
  }
}
