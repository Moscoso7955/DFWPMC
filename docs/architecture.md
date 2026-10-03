# Public Market architecture

As of October 2, 2026, **`Moscoso7955/DFWPMC` owns the four applications**. Vercel builds each application from its own directory. The accepted October 1 blueprint is preserved at [apps/publicmarket/docs/architecture/project-blueprint.png](../apps/publicmarket/docs/architecture/project-blueprint.png).

| App directory / Vercel Root Directory | Existing Vercel project | Website | Portal | Login page owned by hub |
| --- | --- | --- | --- | --- |
| `apps/publicmarket` | `fwpublicmarket` | `/` | `/admin` selector | — |
| `apps/madrone` | `fwpublicmarket-madrone` | `/madrone` | `/madrone/admin` | `/admin/login/madrone` |
| `apps/willow` | `fwpublicmarket-willow` | `/willow` | `/willow/admin` | `/admin/login/willow` |
| `apps/publicmarketcafe` | `fwpublicmarket-publicmarketcafe` | `/publicmarketcafe` | `/publicmarketcafe/admin` | `/admin/login/pmcafe` |

## Routing and UI ownership

`apps/publicmarket/src/features/admin-entry` contains the accepted selector and login components. `apps/publicmarket/src/brands` holds the shared brand registry. Public venue navigation and admin selection use that registry; preserve the accepted Willow → Madrone → PM cafe selector order.

The hub's `next.config.ts` forwards the three venue prefixes to the stable aliases of their existing Vercel projects. Keep these external rewrites in `beforeFiles`: documents, assets, API requests and normalized RSC segment-prefetch requests must reach the venue app before the hub matches its own routes. Cross-app navigation and native login submissions establish the destination app's page and session.

Each venue's `next.config.ts` supplies its own `basePath`. All 41 page routes per venue remain inside that application, including public pages, CMS editors, Ticketing, Blackbook, ticket detail, checkout and legal pages. The repository consolidation copies the currently deployed application code and assets without a UI change.

The root `/admin` is the selector. Legacy hub editor modules and `/admin/api/*` remain historical hub implementation; they do not own venue portal content. All admin entry routes retain `noindex, nofollow`.

## Sessions and content

Each venue retains its own Vercel environment settings, private Blob store and session signing secrets. Venue-prefixed cookies prevent a session from becoming another venue's session. Each app keeps independent published content, drafts, uploads, contacts, subscribers and CMS statistics.

Hosted CMS documents use the existing venue/production or venue/preview namespaces. Preserve the storage connections and both scopes. Uploaded website images are served through the venue's public media endpoint; private content records remain private. Local file-backed development uses the content directory inside the selected app.

Git deployment does not overwrite published hosted content. The existing master login value remains in each venue's Vercel environment; never commit it or signing secrets.

## External applications

Ticketing and Blackbook retain labeled preview records and accessible detail pages. Tipsy, Callidus, Stripe, QuickBooks, email/wallet delivery, scheduled jobs and external tracking remain disconnected by each venue's preview guards. Callidus remains a separate application; the venue retains its subscriber connection points.

## Builds and releases

Every app installs its own dependencies and builds using its own `package.json` and lockfile. The root package only supplies convenience commands. The client cutover connects each existing Vercel project to `Moscoso7955/DFWPMC`, with its app directory as Root Directory and `main` as production branch. At handoff, Vercel rejected the collaborator’s Git connection; the live Git links were restored to `alphacotv/fwpublicmarket`. The repository owner must complete the connection before client Git deployments can be validated. Independent deployments and settings preserve venue isolation while developers use a single repository. **Include files outside the Root Directory in the Build Step** is disabled for each project because the app is self-contained; this aligns Next.js tracing with Vercel’s build root. Shared packages would require a deliberate update to that setting and tracing configuration.

The previous venue repositories remain available for history and rollback. [MONOREPO_SOURCE.json](../MONOREPO_SOURCE.json) records each imported repository and commit. Future application changes belong in the corresponding `apps/` directory here.

## Client handoff boundary

The October 2 handoff imports the approved snapshot `02440e5613f67fc64f0a423fc1db005f155cc8cd` from the private source without its Git history. The client’s archive and prior commits remain intact. Application authentication requires explicit environment values in every environment; live passwords, signing secrets and CMS storage values stay in the existing Vercel projects. No URL, cookie, API or content schema changes accompany the handoff.

The root `vercel.json` keeps the older root-directory deployment paused. The four app-directory deployments retain their child configuration and existing Vercel team. The private source repository remains available for rollback.
