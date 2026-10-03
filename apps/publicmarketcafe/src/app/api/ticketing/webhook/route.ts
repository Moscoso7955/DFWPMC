import { venue, disconnectedResponse } from "@/lib/venue";
import type Stripe from "stripe";
import {
  alreadyProcessedStripeEvent,
  enrichOrderFromStripeDetails,
  findOrderByCheckoutSession,
  findOrderByPaymentIntent,
  getEventById,
  getOrderById,
  getOrderMarketingOptIn,
  getTicketingSettings,
  markOrderDisputed,
  markOrderExpired,
  markOrderPaid,
  markOrderRefunded,
} from "@/lib/ticketingStore";
import { addSubscriber } from "@/lib/subscribersStore";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { sendTicketEmail } from "@/lib/ticketEmail";

export const dynamic = "force-dynamic";
// Stripe's signature verifier needs the raw body, so opt out of Next's
// body parser explicitly by reading via arrayBuffer.

export async function POST(request: Request) {
  if (venue.localPreview) return disconnectedResponse("Ticketing integration");

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  let stripe;
  let webhookSecret;
  try {
    stripe = getStripe();
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Config error", { status: 500 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature verification failed";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  // Idempotency — Stripe retries on non-2xx, and even on 2xx may
  // occasionally redeliver. Any duplicate delivery becomes a no-op.
  if (await alreadyProcessedStripeEvent(event.id)) {
    return Response.json({ ok: true, dedup: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;

        // Defensive guard: Stripe fires checkout.session.completed the
        // moment the session finishes even for async payment methods,
        // where payment_status may still be 'unpaid' pending settlement.
        // Card + Link both settle synchronously, so if payment_status
        // isn't 'paid' by now something asynchronous slipped through
        // (bank transfer, BNPL) and we should not mint tickets — a
        // separate charge.succeeded / charge.updated flow would handle
        // it later, but we don't accept those methods anyway (see the
        // payment_method_types allowlist in create-checkout).
        if (session.payment_status !== "paid") break;

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        if (!paymentIntentId) break;

        const stripeFeeCents = await fetchBalanceFeeCents(stripe, paymentIntentId);
        const issuedTickets = await markOrderPaid({ orderId, paymentIntentId, stripeFeeCents });

        // Overwrite the order's buyer fields with whatever Stripe's
        // hosted Checkout page actually collected — the buyer is more
        // likely to type accurate contact info on Stripe's page than
        // rush through our drawer. Nullish fields leave the drawer
        // values alone.
        const details = session.customer_details;
        if (details) {
          await enrichOrderFromStripeDetails(orderId, {
            name: details.name ?? null,
            email: details.email ?? null,
            phone: details.phone ?? null,
          });
        }

        // Marketing opt-in: if the buyer ticked the box in the drawer,
        // add them to the mailing list with source 'ticket_purchase'.
        // addSubscriber upserts by email, so a duplicate signup just
        // refreshes name/phone when we have better data.
        const marketing = await getOrderMarketingOptIn(orderId);
        if (marketing?.optIn) {
          const email = details?.email ?? marketing.email;
          const name = details?.name ?? marketing.name;
          const phone = details?.phone ?? null;
          await addSubscriber(email, "ticket_purchase", name, phone ?? undefined);
        }

        // Fire the confirmation email. Fetch the freshest order (with
        // Stripe's overwritten fields) so the receipt matches what
        // the buyer typed on the Stripe page. Missing Resend config
        // returns false silently — admin can Resend from the portal
        // once the sender is configured.
        try {
          const [freshOrder, freshEvent, settings] = await Promise.all([
            getOrderById(orderId),
            getEventById(session.metadata?.event_id ?? ""),
            getTicketingSettings(),
          ]);
          if (freshOrder && freshEvent && issuedTickets.length > 0) {
            await sendTicketEmail({
              event: freshEvent,
              order: {
                id: freshOrder.id,
                buyerEmail: freshOrder.buyerEmail,
                buyerName: freshOrder.buyerName,
                totalCents: freshOrder.totalCents,
                subtotalCents: freshOrder.subtotalCents,
                serviceFeeCents: freshOrder.serviceFeeCents,
                taxCents: freshOrder.taxCents,
              },
              tickets: issuedTickets,
              settings,
            });
          }
        } catch {
          // Never let email failure roll back the payment.
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) await markOrderExpired(orderId);
        else if (session.id) {
          const order = await findOrderByCheckoutSession(session.id);
          if (order) await markOrderExpired(order.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id ?? null;
        if (!paymentIntentId) break;
        const order = await findOrderByPaymentIntent(paymentIntentId);
        if (!order) break;
        const partial = (charge.amount_refunded ?? 0) < (charge.amount ?? 0);
        await markOrderRefunded(order.id, partial);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId =
          typeof dispute.payment_intent === "string"
            ? dispute.payment_intent
            : dispute.payment_intent?.id ?? null;
        if (!paymentIntentId) break;
        const order = await findOrderByPaymentIntent(paymentIntentId);
        if (order) await markOrderDisputed(order.id);
        break;
      }

      case "payout.paid": {
        // Subscribed so QuickBooks-side reconciliation can match a
        // Stripe payout to the bank deposit that clears from it. We
        // acknowledge the event here (idempotency table above prevents
        // duplicate processing) and return 200; the daily JE cron
        // reads Stripe's balance transactions directly for its
        // accounting posting per spec §8, so nothing else has to
        // happen in this handler today.
        break;
      }

      default:
        // Unhandled — the idempotency insert above already logged it
        // as received. Return 200 so Stripe doesn't retry.
        break;
    }
  } catch (error) {
    // On any handler failure, return 500 so Stripe retries. The dedup
    // table row still contains this event id — but we upgrade to a
    // permanent skip only after a successful handler run.
    const message = error instanceof Error ? error.message : "handler error";
    return new Response(`Handler failed: ${message}`, { status: 500 });
  }

  return Response.json({ ok: true });
}

async function fetchBalanceFeeCents(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<number | null> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    });
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return null;
    const balanceTx = charge.balance_transaction;
    if (!balanceTx || typeof balanceTx === "string") return null;
    return balanceTx.fee ?? null;
  } catch {
    return null;
  }
}
