import { venue } from "./venue";
import type { TicketedEvent, TicketTier, PublicTier, Order, OrderItem, Ticket, TicketingSettings, PromoCode } from "./ticketingTypes";
import type { BlackbookEntry } from "./blackbookStore";
import type { TicketPassData, DoorEventSummary, DoorTicketMatch, OrderListRow, GuestListRow, OrderWithDetails } from "./ticketingStore";

const id = (n: number) => `${venue.fixturePrefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const createdAt = "2026-10-01T18:00:00.000Z";
export const previewEvent: TicketedEvent = {
  id: id(1), slug: "preview-evening", title: `${venue.name} — Sample Evening`,
  descriptionMd: "Preview data. A fictional event for exploring this portal. Replace it after connecting the event backend.",
  imageUrl: venue.brand.heroImage, songUrl: null,
  startsAt: "2030-10-10T00:00:00.000Z", endsAt: "2030-10-10T03:00:00.000Z", doorsAt: "2030-10-09T23:00:00.000Z",
  ageRestriction: "all_ages", capacity: 40, status: "published", createdAt, updatedAt: createdAt,
};
export const previewEvents: TicketedEvent[] = [previewEvent, {
  ...previewEvent, id: id(2), slug: "preview-draft", title: `${venue.name} — Sample Draft`, status: "draft",
}];
export const previewTier: TicketTier = {
  id: id(3), eventId: previewEvent.id, name: "Sample General Admission", description: "Preview tier; no ticket sales are enabled.",
  priceCents: 2000, admitsPerTicket: 1, quantity: 40, sold: 2, held: 1, maxPerOrder: 4,
  salesStartAt: null, salesEndAt: null, sortOrder: 0, isHidden: false,
};
export const previewPublicTier: PublicTier = {
  ...previewTier, remaining: 37, onSale: true, soldOut: false,
};
export const previewSettings: TicketingSettings = {
  taxRate: 0, stripePct: 0.029, stripeFixedCents: 30, holdMinutes: 10,
  refundPolicyMd: "Preview policy — add the approved venue refund policy before connecting checkout.", supportEmail: "",
};
export const previewOrder: Order = {
  id: id(4), eventId: previewEvent.id, status: "paid", buyerName: "Alex Sample", buyerEmail: "alex.sample@example.invalid",
  buyerPhone: null, ageAttested: true, promoCodeId: null, subtotalCents: 4000, discountCents: 0, serviceFeeCents: 146,
  taxCents: 0, totalCents: 4146, isComp: false, stripeCheckoutSessionId: null, stripePaymentIntentId: null,
  stripeFeeCents: null, holdExpiresAt: null, paidAt: createdAt, createdAt,
};
export const previewPendingOrder: Order = {
  ...previewOrder, id: id(5), status: "pending", buyerName: "Jordan Sample", buyerEmail: "jordan.sample@example.invalid",
  subtotalCents: 2000, serviceFeeCents: 88, totalCents: 2088, paidAt: null, holdExpiresAt: "2030-10-10T00:00:00.000Z",
};
export const previewOrders = [previewOrder, previewPendingOrder];
export const previewTickets: Ticket[] = [0, 1].map((n) => ({
  id: id(6+n), orderId: previewOrder.id, tierId: previewTier.id, eventId: previewEvent.id,
  token: `${venue.id}-preview-ticket-${n+1}`, holderName: n === 0 ? "Alex Sample" : "Casey Sample",
  status: n === 0 ? "valid" : "checked_in", checkedInAt: n === 0 ? null : createdAt,
  checkedInBy: n === 0 ? null : "Preview operator", createdAt,
}));
export const previewItems: OrderItem[] = previewOrders.map((order, n) => ({
  id: id(8+n), orderId: order.id, tierId: previewTier.id, quantity: n === 0 ? 2 : 1, unitPriceCents: 2000,
}));
export const previewPromos: PromoCode[] = [{
  id: id(10), eventId: previewEvent.id, code: "PREVIEW", percentOff: 10, amountOffCents: null, maxUses: 10, uses: 0, expiresAt: null,
}];
export const previewGuests: BlackbookEntry[] = [
  { id: 1, name: "Alex Sample", photoUrl: "/assets/brand/sample-guest.svg", notes: "Preview data. Fictional VIP guest.", status: "vip", createdAt, updatedAt: createdAt },
  { id: 2, name: "Taylor Sample", photoUrl: "/assets/brand/sample-guest.svg", notes: "Preview data. Fictional banned-list record for viewing this screen.", status: "banned", createdAt, updatedAt: createdAt },
];
export function previewPass(token: string): TicketPassData | null {
  const ticket = previewTickets.find(t => t.token === token);
  return ticket ? { token: ticket.token, eventId: ticket.eventId, status: ticket.status, holderName: ticket.holderName,
    tierName: previewTier.name, eventTitle: previewEvent.title, eventSlug: previewEvent.slug, eventStartsAt: previewEvent.startsAt,
    eventDoorsAt: previewEvent.doorsAt, eventEndsAt: previewEvent.endsAt, eventAgeRestriction: previewEvent.ageRestriction } : null;
}
export function previewDoorEvents(): DoorEventSummary[] {
  return [{ ...previewEvent, soldTickets: previewTickets.length, checkedIn: 1 }];
}
export function previewGuestRows(eventId: string): GuestListRow[] {
  if (eventId !== previewEvent.id) return [];
  return previewTickets.map(ticket => ({ token: ticket.token, status: ticket.status, holderName: ticket.holderName,
    tierName: previewTier.name, buyerName: previewOrder.buyerName, buyerEmail: previewOrder.buyerEmail,
    buyerPhone: null, checkedInAt: ticket.checkedInAt }));
}
export function previewDoorSearch(eventId: string, query: string): DoorTicketMatch[] {
  const lower = query.trim().toLowerCase();
  return previewGuestRows(eventId).filter(t => `${t.holderName} ${t.buyerName} ${t.buyerEmail}`.toLowerCase().includes(lower))
    .map(t => ({ ...t, eventId, eventTitle: previewEvent.title }));
}
export function previewOrderList(eventId: string, options: { search?: string; status?: Order["status"] }): OrderListRow[] {
  const query = (options.search ?? "").trim().toLowerCase();
  return previewOrders.filter(o => o.eventId === eventId && (!options.status || o.status === options.status)
    && `${o.buyerName} ${o.buyerEmail} ${o.id}`.toLowerCase().includes(query)).map(order => ({ ...order,
      ticketCount: previewTickets.filter(t => t.orderId === order.id).length,
      checkedInCount: previewTickets.filter(t => t.orderId === order.id && t.status === "checked_in").length }));
}
export function previewOrderDetails(orderId: string): OrderWithDetails | null {
  const order = previewOrders.find(o => o.id === orderId);
  return order ? { order, items: previewItems.filter(i => i.orderId === orderId).map(i => ({ ...i, tierName: previewTier.name })),
    tickets: previewTickets.filter(t => t.orderId === orderId) } : null;
}
