import { venue } from "./venue";
// Central Google Ads conversion helper. Both booking success paths call
// fireBookingConversion() through this one module so the send_to value
// is defined in exactly one place.

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
export const GOOGLE_ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL ?? "";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function isGoogleAdsConfigured() {
  if (venue.localPreview) return false;

  return Boolean(GOOGLE_ADS_ID && GOOGLE_ADS_LABEL);
}

export function fireBookingConversion(transactionId: string) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  if (!isGoogleAdsConfigured()) return;

  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LABEL}`,
    transaction_id: transactionId,
  });
}
