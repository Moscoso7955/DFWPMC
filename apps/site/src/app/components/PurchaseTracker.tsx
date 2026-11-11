"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/tracking";

type Props = {
  orderId: string;
  valueCents: number;
  quantity: number;
  eventTitle: string;
};

// Rendered on the paid branch of the ticket confirmation page. Fires the
// GA4/Meta/Ads purchase conversion once per order (sessionStorage dedupe
// lives in trackPurchase).
export default function PurchaseTracker({ orderId, valueCents, quantity, eventTitle }: Props) {
  useEffect(() => {
    trackPurchase({ orderId, valueCents, quantity, eventTitle });
  }, [orderId, valueCents, quantity, eventTitle]);

  return null;
}
