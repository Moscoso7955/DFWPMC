import { addUser, createInvite, listRoles } from "@/lib/accessStore";
import { sendInvite } from "@/lib/inviteEmail";
import { accessActor } from "../guard";

// Adds someone to the list, and sends their invite unless told not to.
export async function POST(request: Request) {
  const actor = await accessActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown; roles?: unknown; invite?: unknown };
  const added = await addUser(body);
  if (!added.ok) return Response.json({ error: added.error }, { status: 400 });
  if (body.invite !== false && added.user.email) {
    const invite = await createInvite(added.user.id);
    if (!invite.ok) return Response.json({ error: invite.error }, { status: 400 });
    try {
      await sendInvite(invite.user, await listRoles(), invite.token, actor);
    } catch (error) {
      return Response.json({ ok: true, user: invite.user, warning: `Added, but the invite email didn't send: ${error instanceof Error ? error.message : "error"}` });
    }
    return Response.json({ ok: true, user: invite.user, invited: true });
  }
  return Response.json({ ok: true, user: added.user });
}
