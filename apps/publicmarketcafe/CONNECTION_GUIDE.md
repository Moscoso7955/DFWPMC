# Connection guide — Public Market Cafe & Goods

This application has a hosted CMS plus disconnected app previews. Configure each client’s services in this folder. Keep `localPreview: true` in `venue.config.json` during preview work; it prevents provider database, checkout, tracking, email, wallet, and cron activity. The dedicated `CMS_STORAGE_READ_WRITE_TOKEN` independently enables hosted CMS content, media, inbox, subscribers, and statistics.

| Connection | Existing attachment point | Client supplies |
|---|---|---|
| Tipsy / booking | CMS Private Events and Reservations embed editors; `src/app/components/EmbedFrame.tsx` | Venue embed code / account. Saved embeds remain paused in preview mode. |
| Careers provider | CMS Careers embed editor | Confirm the client’s provider and venue form; no provider has been assumed. |
| Callidus owner app | `https://fwpublicmarket.com/publicmarketcafe/api/mailing-list/subscribers` and `/api/mailing-list/unsubscribe`; `docs/mailing-list-sync.md` | Separate Callidus app, shared `MAILING_LIST_SYNC_TOKEN`, venue database. Sync endpoints return a disconnected message during preview. |
| Ticketing / Blackbook | `src/lib/ticketingStore.ts`, `src/lib/blackbookStore.ts`, existing app API routes | Dedicated venue Postgres database. Replace preview fixtures with client records. |
| Stripe | Existing checkout/webhook routes; `src/lib/stripe.ts` | Client secret/public keys and webhook secret; venue-prefixed webhook URL and approved refund/tax/support settings. |
| QuickBooks | Ticketing → QBO status page; `src/lib/qboOAuth.ts` | Client Intuit app, company authorization, environment and venue callback URI. No journal-entry job is enabled here. |
| Contact / ticket email | `src/lib/contactNotifier.ts`, `src/lib/ticketEmail.ts` | Resend credentials, verified from address, `CONTACT_TO_EMAIL`, ticket from address and venue support details. |
| Wallet delivery | Existing ticket/order wallet routes; `src/lib/wallet/` | Venue Apple certificates / pass identifiers and Google Wallet issuer/service account. |
| Hosted content/uploads | `src/lib/siteContentStore.ts`, `src/lib/adminFiles.ts` | Client Postgres / Blob keys after migrating this venue’s local content and uploads. |
| External analytics | Original Google Ads module and optional Vercel Analytics component | Client tracking configuration. The local root layout omits external trackers. |

Connect services deliberately, then change preview mode and rebuild after validating the client configuration. `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` remain blank; enabling hosted storage requires migrating local content first. Review source defaults in retained provider code, including sender, venue, policy, address and support details, before activating that service. The original provider implementations remain for this later step.

The three apps use their eventual venue prefixes. The existing Public Market selector and branded CMS login screens are already connected locally: the hub’s ignored `.env.local` sets each `LOCAL_ADMIN_*_ORIGIN`, and `venue.config.json` records the original hub login for return navigation. Forms authenticate directly with the chosen venue app. Each app owns its login secret, sessions, data, and uploads. The deployed CMS returns to the approved login screen on `https://fwpublicmarket.com`. Callidus remains a separate application.

Use `.env.example` as the blank connection checklist. Keep credentials in `.env.local` or the client’s future deployment environment. This repository is the existing venue application linked to its Vercel project. Keep its production CMS storage and session settings in Vercel.

Hosted CMS is already connected to this venue’s private Blob store. Keep its `CMS_STORAGE_READ_WRITE_TOKEN` separate from future provider credentials. `CMS_STORAGE_SCOPE` is `production` on production and `preview` on previews. The website media route exposes only the venue’s image uploads; JSON records are never public. Public Market’s existing login form authenticates through the venue prefix, and CMS publishing updates this venue’s public pages.
