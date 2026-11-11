# Public Market repository

This repository owns one Next.js application, `apps/site`, deployed as the Vercel project `fwpublicmarket` (Root Directory `apps/site`, production branch `main`, domain fwpublicmarket.com). Read `docs/architecture.md` before changing organization or routing, `apps/site/README.md` before changing app code, and the installed Next.js guides for affected APIs; the app uses Next.js 16.2.4.

- One app serves the hub at `/` and the three venues as visual skins under `/willow`, `/madrone` and `/publicmarketcafe`. `src/lib/venues.ts` is the venue registry; venue pages live once under `src/app/(venues)/[venue]/` and are themed by `html[data-venue-theme]` tokens. Preserve every pre-consolidation URL, the approved UI, and the Willow → Madrone → PM cafe selector order.
- One collective staff list and session (cookies at path `/`): the login at `/admin/login`, Google sign-in at `/auth/google/*` with the single redirect URI `/auth/google/callback`, and People & access at `/admin/settings`. The collective keeps one Blackbook at `/blackbook` on the same sign-in (areas `door` to view, `blackbook` to edit); the old `/<venue>/blackbook` URLs redirect there.
- Storage stays per venue inside the one app: private Blob stores via `CMS_<VENUE>_TOKEN`, content and uploads under `content/<slug>/` and `public/<slug>/`. One Postgres serves the collective (staff, content rows, mailing lists).
- Provider integrations remain disconnected behind the preview guards (`NEXT_PUBLIC_LOCAL_PREVIEW`). Keep Callidus separate. Ticketing was intentionally not carried over. A refactor does not authorize enabling integrations or replacing persistent content.
- Render every page before a deploy: `node scripts/render-pages.mjs` against the dev server on port 3110 must pass.
- The four pre-consolidation apps (hub + three venues) are history, recoverable from Git and the former venue repositories; current edits belong in `apps/site`.
- Keep credentials, `.env.local`, `.vercel`, local records, dependencies, builds and deployment receipts out of Git. Preserve unrelated dirty checkouts and existing local previews.
