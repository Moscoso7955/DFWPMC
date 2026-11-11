# Fort Worth Public Market

One Next.js application serves the whole collective from **`Moscoso7955/DFWPMC`**: the hub at fwpublicmarket.com plus the three venues as visual skins under their path prefixes. The Vercel project `fwpublicmarket` builds `apps/site` from `main`.

| Surface | Public path | Admin |
| --- | --- | --- |
| The Public Market (hub) | `/` | `/admin` selector, `/admin/settings` people & access |
| Willow | `/willow` | `/willow/admin` |
| Madrone | `/madrone` | `/madrone/admin` |
| Public Market Cafe & Goods | `/publicmarketcafe` | `/publicmarketcafe/admin` |

The live entry point is [fwpublicmarket.com/admin](https://fwpublicmarket.com/admin): one collective sign-in opens the approved selector, and choosing a brand enters its editor directly. See `apps/site/README.md` for the app's layout and environment, and `docs/architecture.md` for routing, sessions and storage.

## Local development

```
cd apps/site
npm ci
cp .env.example .env.local   # set ADMIN_PASSWORD and ADMIN_SESSION_SECRET
npm run dev                  # port 3110
```

Before any deploy, render every page: `node scripts/render-pages.mjs` from the repo root against the running dev server; it must exit clean.

## History

The repository previously held four independently deployed applications (hub + three venues). They were consolidated into `apps/site` on November 11, 2026 and removed from the working tree; Git history and the imported-source record in [MONOREPO_SOURCE.json](MONOREPO_SOURCE.json) preserve them, and the former standalone repositories remain for rollback.
