import { venue, disconnectedResponse } from "@/lib/venue";
import {
  getPublishedEventBySlug,
  markStripeSessionOnOrder,
  releaseHoldForOrder,
  reserveTickets,
  getTicketingSettings,
} from "@/lib/ticketingStore";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  eventSlug?: unknown;
  items?: unknown;
  promoCode?: unknown;
  buyerName?: unknown;
  buyerEmail?: unknown;
  buyerPhone?: unknown;
  ageAttested?: unknown;
  marketingOptIn?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing integration");

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug.trim() : "";
  const buyerName = typeof body.buyerName === "string" ? body.buyerName.trim() : "";
  const buyerEmail = typeof body.buyerEmail === "string" ? body.buyerEmail.trim() : "";
  const buyerPhone = typeof body.buyerPhone === "string" ? body.buyerPhone.trim() : "";
  const ageAttested = Boolean(body.ageAttested);
  const marketingOptIn = Boolean(body.marketingOptIn);
  const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim() : "";
  const items = Array.isArray(body.items) ? body.items : [];

  if (!eventSlug) return Response.json({ error: "Missing event." }, { status: 400 });
  if (!buyerName) return Response.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_PATTERN.test(buyerEmail)) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const parsedItems = items
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as { tierId?: unknown; quantity?: unknown };
      const tierId = typeof r.tierId === "string" ? r.tierId : "";
      const quantity = Number(r.quantity);
      if (!tierId || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { tierId, quantity: Math.floor(quantity) };
    })
    .filter((row): row is { tierId: string; quantity: number } => row !== null);

  if (parsedItems.length === 0) {
    return Response.json({ error: "Add at least one ticket." }, { status: 400 });
  }

  const event = await getPublishedEventBySlug(eventSlug);
  if (!event) return Response.json({ error: "Event unavailable." }, { status: 404 });

  if (event.ageRestriction !== "all_ages" && !ageAttested) {
    return Response.json({ error: "Please confirm the age requirement." }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await reserveTickets({
      eventId: event.id,
      items: parsedItems,
      promoCode: promoCode || null,
      buyerName,
      buyerEmail,
      buyerPhone: buyerPhone || null,
      ageAttested,
      marketingOptIn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed.";
    // Postgres RAISE EXCEPTION comes through as an Error whose message
    // starts with the exception code word we picked in reserve_tickets.
    return Response.json({ error: pretty(message) }, { status: 400 });
  }

  // Zero-total order (100% promo, comp) — no Stripe session. In this
  // Phase-3 build we simply return the order; Phase-5 will generate
  // tickets/emails for comps through the admin flow, so a $0 order
  // buyer path that we auto-issue on will be added when that lands.
  if (reservation.totalCents === 0) {
    return Response.json({
      ok: true,
      free: true,
      orderId: reservation.orderId,
      redirectUrl: `${getSiteUrl()}/calendar/${event.slug}/confirmation?order=${reservation.orderId}`,
    });
  }

  const settings = await getTicketingSettings();
  const stripe = getStripe();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  // Prorate any promo discount across the ticket tier line items —
  // Stripe rejects negative unit_amount on line_items, so a separate
  // "-$0.10" row is a 500. Instead we consolidate each tier as a
  // single line whose unit_amount already accounts for its share of
  // the discount. Last tier absorbs any rounding remainder so the
  // Stripe subtotal matches our reserve_tickets total exactly.
  const totalTicketSubtotal = reservation.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  let discountRemaining = reservation.discountCents;
  for (let idx = 0; idx < reservation.items.length; idx += 1) {
    const item = reservation.items[idx];
    const itemSubtotal = item.unitPriceCents * item.quantity;
    let itemDiscount = 0;
    if (reservation.discountCents > 0 && totalTicketSubtotal > 0) {
      if (idx === reservation.items.length - 1) {
        itemDiscount = discountRemaining;
      } else {
        itemDiscount = Math.floor((itemSubtotal / totalTicketSubtotal) * reservation.discountCents);
        discountRemaining -= itemDiscount;
      }
    }
    const netCents = Math.max(0, itemSubtotal - itemDiscount);
    const qtySuffix = item.quantity > 1 ? ` × ${item.quantity}` : "";
    const promoSuffix = itemDiscount > 0 ? " (promo applied)" : "";
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: netCents,
        product_data: {
          name: `${event.title} — ${item.name}${qtySuffix}${promoSuffix}`,
        },
      },
    });
  }
  if (reservation.serviceFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: reservation.serviceFeeCents,
        product_data: { name: "Service fee" },
      },
    });
  }
  if (reservation.taxCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: reservation.taxCents,
        product_data: {
          name: `Sales tax (${settings?.taxRate ? (settings.taxRate * 100).toFixed(3) : "13.475"}%)`,
        },
      },
    });
  }

  // Stripe Checkout Session with a hard expiry matched to the DB hold.
  // Metadata gives the webhook everything it needs to reconcile without
  // re-doing the price math on the backend.
  const holdExpires = new Date(reservation.holdExpiresAt).getTime();
  const expiresAtEpoch = Math.max(
    Math.floor(Date.now() / 1000) + 60 * 30,
    Math.floor(holdExpires / 1000),
  );

  const metadata = {
    order_id: reservation.orderId,
    event_id: event.id,
    event_slug: event.slug,
    subtotal_cents: String(reservation.subtotalCents),
    discount_cents: String(reservation.discountCents),
    service_fee_cents: String(reservation.serviceFeeCents),
    tax_cents: String(reservation.taxCents),
    total_cents: String(reservation.totalCents),
  };

  const siteUrl = getSiteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Embedded UI renders inside barphoebe.com — no cs.stripe.com URL.
    // The buyer never leaves our chrome. Stripe renamed `embedded`
    // → `embedded_page` in API `2026-08-26.dahlia`; server-side the
    // old value is a 400.
    ui_mode: "embedded_page",
    // Card only at the top level. On a supporting browser Stripe
    // surfaces Apple Pay / Google Pay as express buttons above the
    // card form automatically — those are the intended defaults.
    // Listing "link" here made Stripe's adaptive-default logic pick
    // Link on desktops that don't have Apple/Google Pay, which the
    // buyer specifically didn't want. Link is still offered as an
    // inline "Save with Link" prompt within card entry, which is
    // exactly "last" — after the buyer's already committed to card.
    payment_method_types: ["card"],
    // Link rides on the card rail and Stripe shows it as the top
    // "Pay securely with Link" button (plus Link bank/Klarna rows)
    // even when it isn't listed above. It can't be reordered below
    // card, so turn it off; Apple Pay / Google Pay stay on top.
    wallet_options: { link: { display: "never" } },
    // Public Market Cafe & Goods's test sandbox has Managed Payments enabled by
    // default, which is incompatible with statement_descriptor_suffix.
    // We want the "PUBLIC MARKET CAFE & GOODS* TIX" suffix on the live account (which
    // does NOT have Managed Payments) per spec §5, so opt out
    // per-request. On live this is a no-op; on the test sandbox it
    // unblocks checkout without a dashboard change.
    managed_payments: { enabled: false },
    expires_at: expiresAtEpoch,
    customer_email: buyerEmail,
    // Ask Stripe for the buyer's phone number too. It's optional in
    // Stripe's UI, so if the buyer skips it here we still have the one
    // they may have typed in the drawer. The webhook merges the two
    // via enrichOrderFromStripeDetails().
    phone_number_collection: { enabled: true },
    line_items: lineItems,
    payment_intent_data: {
      metadata,
      statement_descriptor_suffix: "TIX",
    },
    metadata,
      return_url: `${siteUrl}/calendar/${event.slug}/confirmation?order=${reservation.orderId}&session={CHECKOUT_SESSION_ID}`,
    });
  } catch (error) {
    // Stripe rejected the session. The DB hold is already in place —
    // release it now so the tier isn't locked until the +5-min-grace
    // stale-hold cron catches up 30+ minutes from now. Without this
    // one bad request would burn inventory until the sweeper ran.
    await releaseHoldForOrder(reservation.orderId).catch(() => {});
    const message = error instanceof Error ? error.message : "Payment setup failed.";
    console.error("[checkout] Stripe session create failed", message);
    return Response.json(
      { error: "Couldn't reach the payment processor. Please try again." },
      { status: 502 },
    );
  }

  await markStripeSessionOnOrder(reservation.orderId, session.id);

  return Response.json({
    ok: true,
    orderId: reservation.orderId,
    // Embedded flow: hand the client_secret back to the browser so the
    // buyer stays on barphoebe.com. The drawer navigates to the
    // in-site checkout page which mounts Stripe's <EmbeddedCheckout />.
    clientSecret: session.client_secret,
    checkoutSessionId: session.id,
  });
}

// Turn PL/pgSQL RAISE messages into buyer-facing copy.
function pretty(message: string): string {
  const top = message.split("\n")[0] ?? message;
  const normalized = top.replace(/^error:\s*/i, "").trim().toUpperCase();
  if (normalized.includes("EVENT_UNAVAILABLE")) return "This event isn't available.";
  if (normalized.includes("NO_ITEMS")) return "Add at least one ticket.";
  if (normalized.includes("BAD_QUANTITY")) return "Ticket quantity must be positive.";
  if (normalized.includes("TIER_UNAVAILABLE")) return "One of the selected tiers isn't available.";
  if (normalized.includes("TIER_NOT_ON_SALE_YET")) return "That tier isn't on sale yet.";
  if (normalized.includes("TIER_SALES_CLOSED")) return "Sales for that tier just closed.";
  if (normalized.includes("MAX_PER_ORDER_EXCEEDED")) return "You've exceeded the per-order limit for a tier.";
  if (normalized.includes("TIER_SOLD_OUT")) return "That tier just sold out.";
  if (normalized.includes("EVENT_SOLD_OUT")) return "This event just sold out.";
  if (normalized.includes("PROMO_INVALID")) return "That promo code isn't valid.";
  if (normalized.includes("PROMO_EXPIRED")) return "That promo code has expired.";
  if (normalized.includes("PROMO_MAX_USES")) return "That promo code has been used up.";
  return "Something went wrong. Please try again.";
}
