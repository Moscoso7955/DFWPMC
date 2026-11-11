export type AgeRestriction = "21+" | "18+" | "all_ages";

export type EventStatus = "draft" | "published" | "cancelled" | "past";

export type OrderStatus =
  | "pending"
  | "paid"
  | "expired"
  | "refunded"
  | "partially_refunded"
  | "disputed";

export type TicketStatus = "valid" | "checked_in" | "void";

export type TicketingSettings = {
  taxRate: number;
  stripePct: number;
  stripeFixedCents: number;
  holdMinutes: number;
  refundPolicyMd: string | null;
  supportEmail: string | null;
};

export type TicketedEvent = {
  id: string;
  slug: string;
  title: string;
  descriptionMd: string | null;
  imageUrl: string | null;
  // Spotify track link; its 30s preview plays in link previews.
  songUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  doorsAt: string | null;
  ageRestriction: AgeRestriction;
  capacity: number | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type TicketTier = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number;
  admitsPerTicket: number;
  quantity: number;
  sold: number;
  held: number;
  maxPerOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  sortOrder: number;
  isHidden: boolean;
};

export type PublicTier = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number;
  admitsPerTicket: number;
  remaining: number;
  maxPerOrder: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  sortOrder: number;
  onSale: boolean;
  // Every ticket actually sold (holds from open checkouts don't count).
  soldOut: boolean;
};

export type PromoCode = {
  id: string;
  eventId: string;
  code: string;
  percentOff: number | null;
  amountOffCents: number | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
};

export type Order = {
  id: string;
  eventId: string;
  status: OrderStatus;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  ageAttested: boolean;
  promoCodeId: string | null;
  subtotalCents: number;
  discountCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  isComp: boolean;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeFeeCents: number | null;
  holdExpiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  tierId: string;
  quantity: number;
  unitPriceCents: number;
};

export type Ticket = {
  id: string;
  orderId: string;
  tierId: string;
  eventId: string;
  token: string;
  holderName: string | null;
  status: TicketStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
};

export type ReserveResult = {
  orderId: string;
  holdExpiresAt: string;
  items: Array<{ tierId: string; name: string; quantity: number; unitPriceCents: number }>;
  subtotalCents: number;
  discountCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  isComp: boolean;
};

export type ReserveError =
  | "EVENT_UNAVAILABLE"
  | "NO_ITEMS"
  | "BAD_QUANTITY"
  | "TIER_UNAVAILABLE"
  | "TIER_NOT_ON_SALE_YET"
  | "TIER_SALES_CLOSED"
  | "MAX_PER_ORDER_EXCEEDED"
  | "TIER_SOLD_OUT"
  | "EVENT_SOLD_OUT"
  | "PROMO_INVALID"
  | "PROMO_EXPIRED"
  | "PROMO_MAX_USES";

export type CheckInResult =
  | { status: "ok"; holderName: string | null; tierName: string; ageRestriction: AgeRestriction; eventTitle: string }
  | { status: "already"; checkedInAt: string; holderName: string | null; tierName: string; ageRestriction: AgeRestriction }
  | { status: "void" }
  | { status: "wrong_event"; eventTitle: string }
  | { status: "not_found" };
