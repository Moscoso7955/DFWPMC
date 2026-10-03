import { venue, venueSiteUrl } from "./venue";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (venue.localPreview) throw new Error("Stripe is not connected in local preview.");

  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  cached = new Stripe(key, {
    // API version is pinned to whatever the SDK is built against —
    // Stripe types match the installed SDK so we don't hardcode here.
    typescript: true,
  });
  return cached;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

export function getSiteUrl(): string {
  if (venue.localPreview) return venueSiteUrl();

  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}
