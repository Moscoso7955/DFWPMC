import { venue, venueSiteUrl } from "./venue";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Singleton so we don't reload Stripe.js on every checkout mount. Next
// bundles this once for the client; on the server it never runs because
// the checkout component that consumes it is a "use client" module.
let cached: Promise<Stripe | null> | null = null;

export function getStripeBrowser(): Promise<Stripe | null> {
  if (venue.localPreview) throw new Error("Stripe is not connected in local preview.");

  if (cached) return cached;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    // Surface the missing env var loudly rather than sending Stripe.js
    // a null publishable key and getting a cryptic runtime error.
    return Promise.reject(new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured"));
  }
  cached = loadStripe(key);
  return cached;
}
