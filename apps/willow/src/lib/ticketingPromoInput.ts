import type { PromoInput } from "@/lib/ticketingStore";

export function parsePromoInput(body: Record<string, unknown>): PromoInput | { error: string } {
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (code.length < 2) return { error: "Code must be at least 2 characters." };
  if (!/^[A-Z0-9_-]+$/.test(code)) return { error: "Code: letters, numbers, - and _ only." };

  const percentRaw = body.percentOff;
  const amountRaw = body.amountOffCents;
  const percentOff =
    percentRaw === null || percentRaw === undefined || percentRaw === ""
      ? null
      : Number(percentRaw);
  const amountOffCents =
    amountRaw === null || amountRaw === undefined || amountRaw === ""
      ? null
      : Math.round(Number(amountRaw));

  if (percentOff === null && amountOffCents === null) {
    return { error: "Set either a percent-off or a dollar-off discount." };
  }
  if (percentOff !== null && amountOffCents !== null) {
    return { error: "Choose percent-off OR dollar-off, not both." };
  }
  if (percentOff !== null && (percentOff <= 0 || percentOff > 100)) {
    return { error: "Percent-off must be between 0 and 100." };
  }
  if (amountOffCents !== null && amountOffCents <= 0) {
    return { error: "Dollar-off must be a positive amount." };
  }

  const maxUsesRaw = body.maxUses;
  const maxUses =
    maxUsesRaw === null || maxUsesRaw === undefined || maxUsesRaw === ""
      ? null
      : Math.max(1, Math.floor(Number(maxUsesRaw)));

  const expiresAt =
    typeof body.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;

  return { code, percentOff, amountOffCents, maxUses, expiresAt };
}
