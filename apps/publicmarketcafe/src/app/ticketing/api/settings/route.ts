import { venue, disconnectedResponse } from "@/lib/venue";
import { hasTicketingManagerSession } from "@/lib/ticketingAuth";
import { updateTicketingSettings } from "@/lib/ticketingStore";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing backend");

  if (!(await hasTicketingManagerSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    taxRate?: unknown;
    holdMinutes?: unknown;
    refundPolicyMd?: unknown;
    supportEmail?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taxRate = Number(body.taxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.5) {
    return Response.json({ error: "Tax rate must be a decimal between 0 and 0.5." }, { status: 400 });
  }
  const holdMinutes = Math.floor(Number(body.holdMinutes));
  if (!Number.isFinite(holdMinutes) || holdMinutes < 30 || holdMinutes > 240) {
    return Response.json({ error: "Hold minutes must be between 30 and 240." }, { status: 400 });
  }
  const refundPolicyMd =
    typeof body.refundPolicyMd === "string" && body.refundPolicyMd.trim().length > 0
      ? body.refundPolicyMd.trim()
      : null;
  const supportEmail =
    typeof body.supportEmail === "string" && body.supportEmail.trim().length > 0
      ? body.supportEmail.trim()
      : null;
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return Response.json({ error: "Support email is not a valid address." }, { status: 400 });
  }

  const settings = await updateTicketingSettings({
    taxRate,
    holdMinutes,
    refundPolicyMd,
    supportEmail,
  });
  return Response.json({ ok: true, settings });
}
