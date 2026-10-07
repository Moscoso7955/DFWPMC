# Business-wide tracking (GA4, Meta Pixel, Google Ads)

The collective is one LLC, so all four apps share **one GA4 property, one
Meta pixel and one Google Ads account**. Every event carries a `venue`
parameter (`willow`, `madrone`, `publicmarketcafe`, or `publicmarket` for
the hub) and GA4 page views set `content_group` to the venue, so each unit
can be broken out in reports while the data rolls up to the business.
Brand domains (barwillow.com, …) redirect into fwpublicmarket.com paths,
so the one pixel sees all traffic.

## How it loads

Each app mounts `<TrackingScripts />` (from `src/app/components/`) in its
root layout, driven by `src/lib/tracking.ts`. Nothing loads unless
`NEXT_PUBLIC_TRACKING_ENABLED=true` **and** at least one tag id is set.
This switch is deliberately independent of `venue.localPreview`, so pixels
can launch without enabling payments/database/email at the same time.

Environment variables (set per Vercel project; same ids on all four):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_TRACKING_ENABLED` | `true` to load tags |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_META_PIXEL_ID` | numeric pixel id |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-XXXXXXXXX` (already existed on venues) |
| `NEXT_PUBLIC_GOOGLE_ADS_LABEL` | booking conversion label (existing) |
| `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` | ticket purchase conversion label (venues) |
| `NEXT_PUBLIC_TRACKING_CONSENT_DEFAULT` | empty/`granted` (US opt-out default) or `denied` (consent-first; pair with a consent banner) |

Google Consent Mode v2 defaults and `fbq('consent', …)` are set from
`NEXT_PUBLIC_TRACKING_CONSENT_DEFAULT` before any tag initializes.

## What never gets tagged

- `/admin`, `/ticketing`, `/blackbook` (staff surfaces)
- `/t/<token>` ticket pages (bearer URLs must not reach third parties)
- GA4 page views are sent manually with the **query string stripped**, so
  order ids never reach Google.

Known gap: the Meta pixel auto-collects the full URL, so on the ticket
confirmation page the `?order=<uuid>` param is visible to Meta (the uuid is
unguessable but opens a page showing the buyer's name/email). If this is a
concern, move the Purchase event to a server-side Meta Conversions API call
from the Stripe webhook and exclude the confirmation page from tags.

## Events wired

| Event | Where | GA4 | Meta |
|---|---|---|---|
| Page view | every tagged page, SPA navs included | `page_view` | `PageView` |
| Contact form | venue + hub contact pages | `generate_lead` | `Contact` |
| Newsletter signup | venue + hub forms | `sign_up` | `CompleteRegistration` |
| Tipsy booking | venue reservations / private events (postMessage) | `generate_lead` | `Schedule` |
| Ticket drawer opened | venue event pages | `begin_checkout` | `InitiateCheckout` |
| Ticket purchase | venue confirmation page (paid, deduped per order) | `purchase` | `Purchase` |

The pre-existing Google Ads booking conversion (`fireBookingConversion`)
still fires on Tipsy bookings and remains gated by `localPreview` + its two
env vars. The ticket purchase additionally fires an Ads conversion when
`NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` is set.

## Go-live checklist

1. Publish real privacy/terms text (all pages are placeholders today; the
   hub has no legal pages at all) — both ad platforms require a privacy
   policy, and it must disclose Google/Meta cookies.
2. Make the contact form's mailing-list enrolment an explicit opt-in (it
   currently subscribes silently and re-subscribes unsubscribed people).
3. Create the GA4 property and Meta pixel for the LLC; in GA4, register a
   custom dimension for the `venue` event parameter.
4. Set the env vars above on all four Vercel projects (preview first).
5. Verify on a preview deployment with Google Tag Assistant and Meta Pixel
   Helper, then set `NEXT_PUBLIC_TRACKING_ENABLED=true` in production.

## Mailing-list roll-up for Tipsy

Each venue exposes `GET /api/mailing-list/subscribers` (+ unsubscribe
POST) behind its own `MAILING_LIST_SYNC_TOKEN` — Tipsy can poll all three
and merge on email. Both endpoints return 503 while `localPreview` is on,
and signups collected so far live in the venues' Blob stores (not
Postgres), so a one-time migration is needed when venues go live. A single
hub-level roll-up endpoint for the LLC is a possible follow-up.
