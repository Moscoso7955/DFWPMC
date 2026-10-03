# Fort Worth Public Market

The Public Market website, admin selector, three branded login screens and three venue website/admin applications live in **one repository: `Moscoso7955/DFWPMC`**.

Each application keeps its own Next.js build, package lock, Vercel project, environment settings and CMS storage. Vercel deploys each application from its directory in this repository.

| Directory | Vercel project | Public path | Admin entry |
| --- | --- | --- | --- |
| `apps/publicmarket` | `fwpublicmarket` | `/` | `/admin` |
| `apps/madrone` | `fwpublicmarket-madrone` | `/madrone` | `/madrone/admin` |
| `apps/willow` | `fwpublicmarket-willow` | `/willow` | `/willow/admin` |
| `apps/publicmarketcafe` | `fwpublicmarket-publicmarketcafe` | `/publicmarketcafe` | `/publicmarketcafe/admin` |

The live entry point is [fwpublicmarket.com/admin](https://fwpublicmarket.com/admin). The hub forwards the three venue prefixes to their existing Vercel projects. It owns the approved selector and login designs. Each venue owns its public website, editor, content and authenticated session.

## Local development

Install dependencies in the app you are working on: `npm --prefix apps/willow ci`, for example. The root package supplies convenience scripts; it has no shared runtime dependencies.

- `npm run dev:publicmarket` — hub at port 3014.
- `npm run dev:madrone` — Madrone at port 3111.
- `npm run dev:willow` — Willow at port 3112.
- `npm run dev:publicmarketcafe` — Cafe at port 3113.
- `npm run build:all` — build all four applications.

Copy the selected app’s blank `.env.example` to its ignored `.env.local` and configure its required passwords and signing secrets. Authentication requires these values in development as well as production. Configure ignored `.env.local` inside the selected app. Use development credentials locally; authorized release operators can retrieve deployment settings from the corresponding Vercel project. Keep each app's values separate. The original local preview projects and their existing processes remain available in their previous folders. Stop a process before reusing its port for this checkout.

This snapshot retains production routing: hub venue rewrites and venue login-return URLs point to the live deployment. For an isolated local check, open the venue’s local URL directly and configure its local authentication environment; the earlier local preview checkouts retain the complete local selector/login flow. Local development uses each venue's own content files when hosted CMS storage is absent. Hosted production uses the existing dedicated private Blob store and production namespace. A repository deployment preserves previously published content and uploads in those stores.

## Deployment and ownership

Set each existing Vercel project's **Root Directory** to its directory in the table and connect it to `Moscoso7955/DFWPMC`, production branch `main`. Build and install commands run inside that application's directory. Disable **Include files outside the Root Directory in the Build Step**: each app has all of its own dependencies and assets, and this keeps Next.js tracing aligned with Vercel's app build root. Preserve the project's current environment variables, domains and storage connection.

The previous `alphacotv/madrone`, `alphacotv/willow` and `alphacotv/publicmarketcafe` repositories remain historical rollback sources. Make current changes here. [MONOREPO_SOURCE.json](MONOREPO_SOURCE.json) records the exact commits imported on October 2, 2026.

All 41 page routes in each venue, including Ticketing and Blackbook shells, are retained. Tipsy, Callidus, Stripe, QuickBooks, email/wallet delivery, external tracking and scheduled integrations remain disconnected until separately configured. Callidus remains a separate application. Each venue's `CONNECTION_GUIDE.md` describes its connection points.

See [docs/architecture.md](docs/architecture.md) for routing and data boundaries.

## Client handoff

The application snapshot was imported from `alphacotv/fwpublicmarket` commit `02440e5613f67fc64f0a423fc1db005f155cc8cd`, with credential defaults removed for this public repository. The client’s existing Git history and `archive/legacy-site` are preserved. Private source history and deployment secrets were not imported.

The root `vercel.json` intentionally skips the client’s older root-directory deployment. The four active Vercel projects build from their `apps/` directories and use each app’s own `vercel.json`. Keep root-level legacy builds paused while these four projects serve the live website. Hosting remains with the existing Vercel team; this handoff changes the Git source.
