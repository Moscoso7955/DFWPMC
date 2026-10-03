import type { PublicTier } from "./ticketingTypes";

export type Availability =
  | { state: "on_sale"; fromPriceCents: number }
  | { state: "upcoming"; opensAt: string }
  | { state: "held" }
  | { state: "closed" }
  | { state: "sold_out" }
  | { state: "none" };

// Why an event can or can't be bought right now. "Sold out" only when
// every tier has actually sold through, not when sales haven't opened,
// have closed, or the last tickets are held by open checkouts.
export function getAvailability(tiers: PublicTier[], now = Date.now()): Availability {
  if (tiers.length === 0) return { state: "none" };

  const onSale = tiers.filter((t) => t.onSale);
  if (onSale.length > 0) {
    return { state: "on_sale", fromPriceCents: Math.min(...onSale.map((t) => t.priceCents)) };
  }

  const unsold = tiers.filter((t) => !t.soldOut);
  if (unsold.length === 0) return { state: "sold_out" };

  const opening = unsold
    .map((t) => t.salesStartAt)
    .filter((at): at is string => Boolean(at && new Date(at).getTime() > now))
    .sort();
  if (opening.length > 0) return { state: "upcoming", opensAt: opening[0] };

  const stillOpen = unsold.some((t) => !t.salesEndAt || new Date(t.salesEndAt).getTime() > now);
  return stillOpen ? { state: "held" } : { state: "closed" };
}

export function availabilityLabel(availability: Availability): string {
  switch (availability.state) {
    case "on_sale":
      return `from $${(availability.fromPriceCents / 100).toFixed(2)}`;
    case "upcoming": {
      const opens = new Date(availability.opensAt);
      const day = opens.toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" });
      const minutes = Number(opens.toLocaleString("en-US", { timeZone: "America/Chicago", minute: "numeric" }));
      const time = opens.toLocaleTimeString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        ...(minutes ? { minute: "2-digit" as const } : {}),
      });
      return `Opens ${day} · ${time}`;
    }
    case "held":
      return "Check back soon";
    case "closed":
      return "Sales closed";
    case "sold_out":
      return "Sold out";
    case "none":
      return "Tickets soon";
  }
}
