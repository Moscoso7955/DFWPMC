# Fort Worth Public Market — consolidated website and admin

One Next.js app serving the whole collective: the hub at `/` (selector home,
visit, admin portal entry) and the three venues as visual skins under their
existing path prefixes — `/willow`, `/madrone`, `/publicmarketcafe` — with
every public page, editor and API keeping its pre-consolidation URL.

- `src/lib/venues.ts` is the venue registry (brand, env prefixes, paths).
- `src/app/(hub)` is the collective: selector home, `/visit`, `/admin`
  (approved selector + login), People & access settings, master contact
  list, Apple Pay domain association.
- `src/app/(venues)/[venue]` is the venue tree: one set of routes rendered
  per venue, themed by `html[data-venue-theme]` tokens in `venue-ui.css`.
- One collective staff list and session (`pm_admin_session` /
  `pm_staff_session`, path `/`): sign in once, work in any venue portal.
  Google invite-only sign-in uses the single redirect URI
  `<site>/auth/google/callback`; the shared password works until the first
  Admin Google sign-in retires it.
- Storage: one Postgres (staff, content rows, mailing lists) and the
  existing per-venue private Blob stores (`CMS_<VENUE>_TOKEN`, falling back
  to the hub's `CMS_STORAGE_READ_WRITE_TOKEN`).

Local work: `npm ci`, copy `.env.example` to `.env.local` (passwords and a
signing secret are required), `npm run dev` (port 3110). The render gate —
`node ../../scripts/render-pages.mjs` from the repo root — screenshots
every route at two viewports and must pass before a deploy.

Provider integrations (Tipsy payments, Callidus, Stripe beyond the Apple
Pay association, QuickBooks) remain disconnected behind the preview guards
(`NEXT_PUBLIC_LOCAL_PREVIEW`). Ticketing was intentionally not carried
over from the venue apps.

The former per-venue apps in `apps/willow`, `apps/madrone`,
`apps/publicmarketcafe` and the hub in `apps/publicmarket` are the
historical sources for this app and remain for rollback until the Vercel
cutover (fwpublicmarket Root Directory → `apps/site`) is verified.
