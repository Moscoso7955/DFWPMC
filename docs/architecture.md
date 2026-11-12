# Public Market architecture

As of November 12, 2026, **`Moscoso7955/DFWPMC` owns one application: `apps/site`**, deployed by the Vercel project `fwpublicmarket` (Root Directory `apps/site`, production branch `main`) and serving fwpublicmarket.com. The original October 1 blueprint is preserved at [project-blueprint.png](architecture/project-blueprint.png); the November 11 consolidation replaced its four applications with one app that keeps every URL, and November 12 connected the collective's services (database, email, photo storage, Google sign-in) and brought over the Bar Phoebe admin tooling.

## One app, three skins

| Surface | Path | Source |
| --- | --- | --- |
| Hub (selector home, visit, admin entry, legal pages, Apple Pay file) | `/`, `/visit`, `/admin*`, `/blackbook`, `/photos/*`, `/privacy` `/terms` `/accessibility`, `/.well-known/...` | `src/app/(hub)` |
| The one collective Blackbook | `/blackbook` (old `/<venue>/blackbook` URLs redirect) | `src/app/(hub)/blackbook` |
| Willow website + editor | `/willow/...` | `src/app/(venues)/[venue]` |
| Madrone website + editor | `/madrone/...` | `src/app/(venues)/[venue]` |
| Public Market Cafe website + editor | `/publicmarketcafe/...` | `src/app/(venues)/[venue]` |

`src/lib/venues.ts` is the venue registry (brand, env prefix, base path). The venue route tree renders once per venue slug; skins come from `html[data-venue-theme]` token blocks in `venue-ui.css` plus per-venue homepage stylesheets. Static assets keep their old URLs under `public/<slug>/`. `src/features/admin-entry` holds the approved selector; `src/brands` is the brand registry. Preserve the Willow → Madrone → PM cafe order everywhere. Every venue page ends in that venue's button grid (`src/app/components/BottomMenu.tsx`): all pages plus the legal links, with the current page filled and a Return Home row on sub-pages.

There are no venue rewrites: all paths are served internally by the one app. `src/proxy.ts` tags admin/blackbook/upload requests with their access area (venue prefix stripped) for the session checks.

## Sessions and access

One collective staff list and one sign-in for the whole collective, Google invite-only (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, Google Cloud project `fwpm-signin`, single redirect URI `https://fwpublicmarket.com/auth/google/callback`). The shared password existed only until the first Admin Google sign-in and was retired on November 12; `ADMIN_SESSION_SECRET` (with the hub's historical `COLLECTIVE_ADMIN_*` names accepted) still signs every session and OAuth state. Cookies `pm_admin_session` and `pm_staff_session` live at path `/`, so one sign-in covers the selector and every venue portal. People, roles, the access grid and the per-person **Update emails** and **Photo alerts** switches live at `/admin/settings`. The Blackbook has no credentials of its own: the `door` area views, the `blackbook` area edits, and its entries and private guest photos live in Postgres (photos served only through a session-checked route). All admin entry and Blackbook routes retain `noindex, nofollow`.

## The admin surface

Every admin page sits under the one fixed admin bar (`src/app/components/AdminBar.tsx`), filtered by the signed-in person's areas. On a venue's pages the bar carries that venue's Website sections and publishes/discards against that venue's content store; site editors render the live site inside a scroll frame under the bar. The collective tools — Photos, Playbook, Vendor contacts, Analytics, Settings, the Blackbook — are market-wide and appear once, whatever page you're on. The portal at `/admin` (the approved brand selector plus the per-venue analytics overview) sits under the same bar.

## Content and storage

Each venue keeps its private Blob store, read through `CMS_<VENUE>_TOKEN` (fallback `CMS_STORAGE_READ_WRITE_TOKEN`), holding its site content, calendar, mailing-list records and menu clicks; hosted documents keep the `{venueId}/{scope}/cms/{name}.json` layout. Local file-backed development uses `content/<slug>/`.

One Neon Postgres (`POSTGRES_URL`, database `fwpm-collective`, connected November 12) holds everything collective: the staff list and roles, Blackbook entries and private photos, photo nights and review marks, the Playbook (plays, tasks, budgets, look book, key dates), vendor contacts, guest page views, and the operating-costs records. Public photo files (full/view/thumb copies) live in the Cloudflare R2 bucket `fwpm-photos`, uploaded straight from the browser with presigned URLs — the bucket needs a CORS policy allowing PUT from fwpublicmarket.com. Email sends through the collective's Resend account (`RESEND_API_KEY`). Git deployment does not overwrite published hosted content; secrets live only in Vercel environment variables (see `apps/site/.env.example` for the full roster).

`NEXT_PUBLIC_LOCAL_PREVIEW` remains unset: the venues' Blob-backed records (subscribers, contact submissions, menu clicks) still run in preview mode, and flipping it to `"false"` waits on a one-time Blob → Postgres migration of those records.

## Market Nights photos

Photographers sign in at `/upload` with contributor logins created on Admin → Photos; the browser resizes each photo and strips location data before uploading. One night exists per date (`/photos/<date>`), and each night carries a venue — picked at upload from the venue calendars or a "Where was it?" selector, editable later on the review page ("Shows at") — which decides whether it lists on the hub's Visit page or one venue's. Ten minutes after an upload goes quiet, everyone with Photo alerts switched on gets one email each. Review is shared (swipe pass/fail/star on a phone); marking it done publishes the passes. Every photo has a short takedown code, and photo events (costume contests, `/contest`) screen entries with Claude (`ANTHROPIC_API_KEY`) before voting.

## Analytics and operating costs

`/admin/analytics` is the collective's one Analytics page: contact submissions, mailing lists, Blackbook, photos and the three calendars roll up to one business, with menu taps kept in per-venue columns and guest page views labelled by venue. Its Operating costs card pulls Vercel hosting (this project's own usage plus the team-wide costs split across the team's projects), the Neon bill by this database's compute hours (through Vercel's Marketplace), Claude usage, estimated photo storage, and typed-in fixed costs (with a Split count for shared bills). It shows this month, last month and the year so far, checks its own numbers after every refresh, and emails `ADMIN_EMAIL` at most once a day while something doesn't add up.

## Scheduled jobs

`apps/site/vercel.json` defines four crons, all bearer-checked against `CRON_SECRET`: the morning release digest and the Playbook reminder emails (hourly gates that send at their appointed local times), the photo-upload alert check (every 10 minutes), and the operating-costs refresh (every 6 hours).

## External applications

Tipsy embeds load when `NEXT_PUBLIC_EMBEDS_ENABLED=true`; payments and external tracking pixels stay disconnected behind the preview guards. Stripe's Apple Pay domain association is served at `/.well-known/apple-developer-merchantid-domain-association` for the collective's own Stripe account. The legal pages at `/privacy`, `/terms` and `/accessibility` carry the real policies of DFW Public Market Collective, LLC (d/b/a the Fort Worth Public Market). Callidus remains a separate application. Ticketing was intentionally not carried into the consolidated app.

## Builds and releases

`apps/site` installs and builds with its own `package.json` and lockfile (`npm ci && npm run build`; dev server port 3110). Before any push: `npx tsc --noEmit`, a full `npm run build` (the dev-mode render gate does not compile every route), and `node scripts/render-pages.mjs` rendering every hub and venue route clean at 1440×900 and 390×844. Pushing `main` deploys the `fwpublicmarket` project; **Include files outside the Root Directory** stays disabled. The pre-consolidation applications were removed from the working tree on November 11, 2026 and remain available in Git history and the former standalone repositories recorded in [MONOREPO_SOURCE.json](../MONOREPO_SOURCE.json); their Vercel sub-projects are retired.
