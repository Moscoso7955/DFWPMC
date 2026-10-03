# Public Market hub architecture

The current repository-wide architecture lives at [docs/architecture.md](../../../docs/architecture.md). As of October 2, 2026, the hub and three venue applications live together in `alphacotv/fwpublicmarket`, under `apps/`, and retain their four existing Vercel projects.

The accepted October 1 blueprint remains here: [project-blueprint.png](architecture/project-blueprint.png). The three final boxes correspond to Madrone, Willow and Public Market Cafe & Goods; the image repeats the Madrone label.

The hub owns `src/features/admin-entry`, `src/brands`, the public homepage, `/admin` selector and three approved `/admin/login/[brand]` pages. Preserve the Willow → Madrone → PM cafe selector order and shared registry used by public venue navigation.

Native login forms submit through the venue-prefixed authentication API. The three external venue rewrites in `next.config.ts` remain in `beforeFiles`, including nested assets, APIs and RSC segment-prefetch requests. Each sibling venue application owns its complete branded public site and authenticated portal.

The previous root hub editor modules and `/admin/api/*` remain historical hub code. Each venue keeps independent session secrets, cookie paths, private Blob content storage, uploads and production/preview namespaces. External provider integrations remain paused. The Public Market V2 homepage and signup handling are preserved.
