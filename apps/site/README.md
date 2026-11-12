# Fort Worth Public Market — consolidated website and admin

One Next.js app serving the whole collective: the hub at `/` (selector home,
visit, admin portal, legal pages) and the three venues as visual skins under
their existing path prefixes — `/willow`, `/madrone`, `/publicmarketcafe` —
with every public page, editor and API keeping its pre-consolidation URL.

- `src/lib/venues.ts` is the venue registry (brand, env prefixes, paths).
- `src/app/(hub)` is the collective: selector home, `/visit`, the admin
  portal and tools (Photos, Playbook, Vendor contacts, Analytics with the
  Operating costs card, People & access), the Blackbook, Market Nights
  photo pages, the costume contest, the photographer upload app, and the
  legal pages.
- `src/app/(venues)/[venue]` is the venue tree: one set of routes rendered
  per venue, themed by `html[data-venue-theme]` tokens in `venue-ui.css`.
  Each venue keeps its own calendar, operating hours, mailing list and
  content store, and every page ends in the venue's button grid.
- One collective staff list and session (`pm_admin_session` /
  `pm_staff_session`, path `/`): sign in once with Google (invite-only,
  single redirect URI `<site>/auth/google/callback`; the shared password
  was retired when the first Admin signed in), work in any venue portal.
  Every admin page sits under the one fixed admin bar
  (`src/app/components/AdminBar.tsx`).
- Storage: one Neon Postgres (staff, Blackbook, photo nights, Playbook,
  contacts, page views, operating costs), the Cloudflare R2 bucket
  `fwpm-photos` for public photo files (its CORS policy must allow PUT
  from the site), Resend for email, and the existing per-venue private
  Blob stores (`CMS_<VENUE>_TOKEN`, falling back to the hub's
  `CMS_STORAGE_READ_WRITE_TOKEN`). `.env.example` is the full roster.

Local work: `npm ci`, copy `.env.example` to `.env.local` (passwords and a
signing secret are required), `npm run dev` (port 3110). Before any push:
`npx tsc --noEmit`, a full `npm run build` (the dev-mode gate does not
compile every route), and the render gate — `node scripts/render-pages.mjs`
from the repo root — which screenshots every route at two viewports and
must pass.

The collective keeps one Blackbook at `/blackbook`, gated by the same
sign-in (`door` area to view, `blackbook` area to edit); the old
`/<venue>/blackbook` URLs redirect there. Provider integrations (Tipsy
payments, Callidus, Stripe beyond the Apple Pay association, external
tracking pixels) remain disconnected behind the preview guards
(`NEXT_PUBLIC_LOCAL_PREVIEW`); flipping that flag waits on migrating the
venues' Blob-backed records (subscribers, submissions, menu clicks) to
Postgres. Ticketing was intentionally not carried over from the venue apps.

The former per-venue apps and the hub were removed from the working tree
on November 11, 2026, after the Vercel cutover was verified; Git history
and `MONOREPO_SOURCE.json` preserve them.
