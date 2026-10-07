// Business-wide tracking configuration for the hub. The collective is one
// LLC, so all four sites share ONE GA4 property, ONE Meta pixel and ONE
// Google Ads account; every event carries a `venue` parameter ("publicmarket"
// here, the venue id on the venue sites) so each unit can still be broken
// out in reports. Only loads when NEXT_PUBLIC_TRACKING_ENABLED is "true".

export const TRACKING_ENABLED = process.env.NEXT_PUBLIC_TRACKING_ENABLED === "true";
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
// "granted" (US default, opt-out regime) or "denied" (consent-first).
export const CONSENT_DEFAULT =
  process.env.NEXT_PUBLIC_TRACKING_CONSENT_DEFAULT === "denied" ? "denied" : "granted";

export const TRACKING_VENUE = "publicmarket";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function isTrackingActive() {
  return TRACKING_ENABLED && Boolean(GA4_ID || META_PIXEL_ID || GOOGLE_ADS_ID);
}

// Staff surfaces never load tags. Venue paths (/willow, /madrone,
// /publicmarketcafe) are served by the venue apps, which mount their own
// copy of this module, so the hub only ever tags its own pages.
const EXCLUDED_PREFIXES = ["/admin", "/blackbook"];

export function isTrackedPath(pathname: string) {
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** page_location with the query string stripped. */
export function cleanLocation() {
  return window.location.origin + window.location.pathname;
}

function ga(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, { venue: TRACKING_VENUE, ...params });
}

function meta(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, { venue: TRACKING_VENUE, ...params });
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
