import { venue } from "./venue";
import { GOOGLE_ADS_ID } from "./googleAds";

// Business-wide tracking configuration. The collective is one LLC, so all
// four sites share ONE GA4 property, ONE Meta pixel and ONE Google Ads
// account; every event carries a `venue` parameter so each unit can still
// be broken out in reports.
//
// Tracking has its own switch (NEXT_PUBLIC_TRACKING_ENABLED) and is
// deliberately NOT tied to venue.localPreview, so pixels can launch
// without flipping payments/database/email at the same time.

export const TRACKING_ENABLED = process.env.NEXT_PUBLIC_TRACKING_ENABLED === "true";
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL ?? "";
// "granted" (US default, opt-out regime) or "denied" (consent-first).
export const CONSENT_DEFAULT =
  process.env.NEXT_PUBLIC_TRACKING_CONSENT_DEFAULT === "denied" ? "denied" : "granted";

export const TRACKING_VENUE = venue.id;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function isTrackingActive() {
  return TRACKING_ENABLED && Boolean(GA4_ID || META_PIXEL_ID || GOOGLE_ADS_ID);
}

// Staff surfaces and bearer-token ticket pages never load tags: admin,
// ticketing and blackbook are not marketing traffic, and /t/<token> URLs
// grant access to a ticket, so they must never reach third parties.
const EXCLUDED_PREFIXES = ["/admin", "/ticketing", "/blackbook", "/t/", "/t"];

export function isTrackedPath(pathname: string) {
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix + "?"),
  );
}

/** page_location with the query string stripped, so order ids and other
 *  params never reach Google. */
export function cleanLocation() {
  return window.location.origin + window.location.pathname;
}

function ga(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, { venue: TRACKING_VENUE, ...params });
}

function meta(eventName: string, params: Record<string, unknown> = {}, custom = false) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(custom ? "trackCustom" : "track", eventName, { venue: TRACKING_VENUE, ...params });
}

export function trackPageView() {
  ga("page_view", { page_location: cleanLocation(), page_title: document.title });
  meta("PageView");
}

/** Contact form submitted. */
export function trackContactLead() {
  ga("generate_lead", { form_type: "contact" });
  meta("Contact");
}

/** Newsletter signup completed. */
export function trackNewsletterSignup() {
  ga("sign_up", { method: "newsletter" });
  meta("CompleteRegistration", { content_name: "newsletter" });
}

/** Tipsy booking submitted (reservations / private events). */
export function trackBooking(kind: "reservation" | "private_event", bookingId: string) {
  ga("generate_lead", { form_type: kind, transaction_id: bookingId });
  meta("Schedule", { content_category: kind });
}

/** Ticket drawer opened for an event. */
export function trackBeginCheckout(eventTitle: string) {
  ga("begin_checkout", { currency: "USD", items: [{ item_name: eventTitle }] });
  meta("InitiateCheckout", { content_name: eventTitle });
}

/** Paid ticket order confirmed. Deduplicated per order id so refreshing
 *  the confirmation page doesn't double-count. */
export function trackPurchase(order: {
  orderId: string;
  valueCents: number;
  quantity: number;
  eventTitle: string;
}) {
  if (typeof window === "undefined") return;
  const dedupeKey = `fwpm_purchase_${order.orderId}`;
  try {
    if (window.sessionStorage.getItem(dedupeKey)) return;
    window.sessionStorage.setItem(dedupeKey, "1");
  } catch {
    // Storage unavailable (private mode) — still fire once per page load.
  }
  const value = order.valueCents / 100;
  ga("purchase", {
    transaction_id: order.orderId,
    value,
    currency: "USD",
    items: [{ item_name: order.eventTitle, quantity: order.quantity }],
  });
  meta("Purchase", {
    value,
    currency: "USD",
    content_name: order.eventTitle,
    num_items: order.quantity,
  });
  if (GOOGLE_ADS_ID && ADS_PURCHASE_LABEL && typeof window.gtag === "function") {
    window.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${ADS_PURCHASE_LABEL}`,
      transaction_id: order.orderId,
      value,
      currency: "USD",
    });
  }
}
