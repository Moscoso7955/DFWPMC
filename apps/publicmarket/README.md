# Public Market hub

Public Market connects the Willow, Madrone, and Public Market Cafe & Goods websites and their live admin portals. See [the current project architecture](../../docs/architecture.md) and the [user's blueprint](docs/architecture/project-blueprint.png) for app boundaries and the planned portal flow.

## Getting Started

Run the local hub:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3014
```

Open [the public hub](http://127.0.0.1:3014/) or [the admin selector](http://127.0.0.1:3014/admin) in Chrome. The selector is available directly at `/admin`, remains absent from public navigation, and inherits `noindex, nofollow` from the admin layout. The previous `/admin/login` entry redirects to `/admin`.

The approved login screens authenticate through each venue’s prefixed API and enter its live portal. The client source is [`Moscoso7955/DFWPMC`](https://github.com/Moscoso7955/DFWPMC); the three venue apps are sibling directories in `apps/`.

## Source organization

- `src/brands`: per-brand configuration, font loaders, and font files.
- `src/features/admin-entry`: shared selector and branded login components.
- `src/app`: Next.js routes and public page composition.
- `docs/architecture.md`: portal destinations, app ownership, and deployment boundaries.

Public venue links and admin selector links use the same brand registry. Each venue app retains its own deployment, content and authentication settings in its sibling directory. This snapshot keeps the production venue rewrites; optional local login origins are listed in `.env.example`.

## Validation

```bash
npm run build
git diff --check
```
