// Apple Pay's check that fwpublicmarket.com may show it. The venue pages
// frame Tipsy's booking form, whose deposit step offers Apple Pay; inside
// a frame Apple checks the top-level site, so Stripe registers
// fwpublicmarket.com on the collective's own Stripe account and Apple
// fetches this file here, served directly (no redirect). It is Stripe's
// file, the same for every merchant and carrying its own expiry, so it is
// read from Stripe rather than copied in to go stale.

const STRIPE_FILE = "https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association";

export async function GET() {
  try {
    const res = await fetch(STRIPE_FILE, { signal: AbortSignal.timeout(8000) });
    const body = res.ok ? await res.text() : "";
    // A hex-encoded signed blob; anything else (an error page) is not passed on.
    if (!body || body.length > 64_000 || !/^[0-9a-f\s]+$/i.test(body)) {
      return new Response("Not available", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return new Response(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not available", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
