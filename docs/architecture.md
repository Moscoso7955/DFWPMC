# Public Market architecture

As of November 11, 2026, **`Moscoso7955/DFWPMC` owns one application: `apps/site`**, deployed by the Vercel project `fwpublicmarket` (Root Directory `apps/site`, production branch `main`) and serving fwpublicmarket.com. The original October 1 blueprint is preserved at [project-blueprint.png](architecture/project-blueprint.png); the November 11 consolidation replaced its four applications with one app that keeps every URL.

## One app, three skins

| Surface | Path | Source |
| --- | --- | --- |
| Hub (selector home, visit, admin entry, Apple Pay file) | `/`, `/visit`, `/admin*`, `/blackbook`, `/.well-known/...` | `src/app/(hub)` |
| The one collective Blackbook | `/blackbook` (old `/<venue>/blackbook` URLs redirect) | `src/app/(hub)/blackbook` |
| Willow website + editor | `/willow/...` | `src/app/(venues)/[venue]` |
| Madrone website + editor | `/madrone/...` | `src/app/(venues)/[venue]` |
| Public Market Cafe website + editor | `/publicmarketcafe/...` | `src/app/(venues)/[venue]` |

`src/lib/venues.ts` is the venue registry (brand, env prefix, base path). The venue route tree renders once per venue slug; skins come from `html[data-venue-theme]` token blocks in `venue-ui.css` plus per-venue homepage stylesheets. Static assets keep their old URLs under `public/<slug>/`. `src/features/admin-entry` holds the approved selector and login components; `src/brands` is the brand registry. Preserve the Willow → Madrone → PM cafe order everywhere.

There are no venue rewrites: all paths are served internally by the one app. `src/proxy.ts` tags admin/blackbook/upload requests with their access area (venue prefix stripped) for the session checks.

## Sessions and access

One collective staff list and one sign-in for the whole collective. The shared password (`ADMIN_PASSWORD`, with the hub's historical `COLLECTIVE_ADMIN_*` names accepted) mints the legacy session; Google invite-only sign-in (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, single redirect URI `https://fwpublicmarket.com/auth/google/callback`) replaces it once the first Admin signs in. Cookies `pm_admin_session` and `pm_staff_session` live at path `/`, so one sign-in covers the selector and every venue portal; `/admin/enter/<brand>` is plain navigation. People, roles and the access grid live at `/admin/settings` (needs `POSTGRES_URL`). The Blackbook has no credentials of its own: the one collective sign-in grants view access through the `door` area and edit access through the `blackbook` area, and its single entry list (`blackbook_entries` in Postgres, preview samples until connected) serves the whole collective. All admin entry and Blackbook routes retain `noindex, nofollow`.

## Content and storage

Each venue keeps its private Blob store, read through `CMS_<VENUE>_TOKEN` (fallback `CMS_STORAGE_READ_WRITE_TOKEN`), with production and preview namespaces chosen by `CMS_STORAGE_SCOPE`. Hosted documents keep the `{venueId}/{scope}/cms/{name}.json` layout, so no migration accompanied the consolidation. Local file-backed development uses `content/<slug>/`. One Postgres database (when connected via `POSTGRES_URL`) holds the collective's staff list, site-content rows (`site_content` keyed `venue:key`, hub rows unprefixed) and mailing lists. The collective analytics overview and master contact CSV on the selector read the venues' own record stores. Git deployment does not overwrite published hosted content; secrets live only in Vercel environment variables.

## External applications

Tipsy embeds load when `NEXT_PUBLIC_EMBEDS_ENABLED=true`; payments, database-backed features, email and external tracking stay disconnected behind the preview guards (`NEXT_PUBLIC_LOCAL_PREVIEW` unset or not `"false"`). Stripe's Apple Pay domain association is served at `/.well-known/apple-developer-merchantid-domain-association` for the collective's own Stripe account. Callidus remains a separate application. Ticketing was intentionally not carried into the consolidated app.

## Builds and releases

`apps/site` installs and builds with its own `package.json` and lockfile (`npm ci && npm run build`; dev server port 3110). Before any deploy, `node scripts/render-pages.mjs` must render every hub and venue route clean at 1440×900 and 390×844. Pushing `main` deploys the `fwpublicmarket` project; **Include files outside the Root Directory** stays disabled. The pre-consolidation applications (hub `apps/publicmarket` and the three venue apps) were removed from the working tree on November 11, 2026 and remain available in Git history and the former standalone repositories recorded in [MONOREPO_SOURCE.json](../MONOREPO_SOURCE.json); their Vercel sub-projects are retired.
