"use client";

import { useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripeBrowser } from "@/lib/stripeClient";

type Props = {
  clientSecret: string;
};

export default function StripeEmbeddedCheckout({ clientSecret }: Props) {
  // Load Stripe.js once per browser session — memo also protects
  // against a re-render replacing the Promise identity and remounting
  // the provider with a fresh iframe.
  const stripePromise = useMemo(() => getStripeBrowser(), []);

  return (
    <div className="embedded-checkout-shell">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
