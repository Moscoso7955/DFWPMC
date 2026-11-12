import { cancelInvite, createInvite, deleteUser, listRoles, setPhotoAlerts, setUpdateEmails, setUserDisabled, updateUser } from "@/lib/accessStore";
import { sendInvite } from "@/lib/inviteEmail";
import { accessActor } from "../../guard";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await accessActor())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // { updateEmails: boolean } switches the morning feature emails on or off.
  if (typeof body.photoAlerts === "boolean") {
    const result = await setPhotoAlerts(id, body.photoAlerts);
    return result.ok ? Response.json({ ok: true, warning: result.error }) : Response.json({ error: result.error }, { status: 400 });
  }
  if (typeof body.updateEmails === "boolean") {
    const result = await setUpdateEmails(id, body.updateEmails);
    return result.ok ? Response.json({ ok: true, warning: result.error }) : Response.json({ error: result.error }, { status: 400 });
  }
  const result = await updateUser(id, body);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}

// { action: "invite" | "cancel" | "disable" | "enable" }
export async function POST(request: Request, { params }: Ctx) {
  const actor = await accessActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: unknown };
  if (action === "invite") {
    const invite = await createInvite(id);
    if (!invite.ok) return Response.json({ error: invite.error }, { status: 400 });
    try {
      await sendInvite(invite.user, await listRoles(), invite.token, actor);
    } catch (error) {
      return Response.json({ error: `The invite email didn't send: ${error instanceof Error ? error.message : "error"}` }, { status: 502 });
    }
    return Response.json({ ok: true });
  }
  if (action === "cancel") {
    await cancelInvite(id);
    return Response.json({ ok: true });
  }
  if (action === "disable" || action === "enable") {
    const result = await setUserDisabled(id, action === "disable");
    return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await accessActor())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteUser(id);
  return result.ok ? Response.json(result) : Response.json({ error: result.error }, { status: 400 });
}
