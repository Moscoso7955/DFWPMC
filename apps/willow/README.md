# Willow website and admin

Current source: [`Moscoso7955/DFWPMC`](https://github.com/Moscoso7955/DFWPMC), directory `apps/willow`. This app retains its existing Vercel project, environment and content store. The former standalone repository remains a historical rollback source.

The public website and all 41 retained portal/page routes use this venue’s approved identity. The Public Market hub owns the selector and approved login screen at `https://fwpublicmarket.com/admin/login/willow`; the form enters `https://fwpublicmarket.com/willow/admin`.

CMS content, uploads, contact inbox, newsletter subscribers, and menu statistics persist in this project’s dedicated private Vercel Blob store. The `CMS_STORAGE_READ_WRITE_TOKEN` and authentication settings live in Vercel environment variables. Production and preview use separate document namespaces. Only uploaded website images are publicly served by the media route; CMS records remain private.

Draft edits remain private until Publish Changes. Discard Draft reloads published content. Login cookies and signing secrets belong to this venue.

Ticketing and Blackbook retain labeled preview records. Tipsy, Callidus, Stripe, QuickBooks, email/wallet delivery, external tracking and cron integrations remain disconnected. `localPreview: true` guards those services independently of hosted CMS storage. See [CONNECTION_GUIDE.md](CONNECTION_GUIDE.md).

Run `npm ci` and `npm run build` for a complete build. Local file-backed development works without the CMS storage variable; copy the blank `.env.example` to ignored `.env.local` and configure authentication settings. Local passwords and signing secrets are required. The original three local preview copies remain separate projects on ports 3111–3113.

The portal source was exported from `Moscoso7955/Barphoebe` at `e08fbc80a72e412f61deef60faf38285c917cffb`, then branded using the existing venue homepage sources. Snapshot and route inventories record this provenance. All 41 original pages and 57 original APIs remain; one API serves hosted CMS images.
