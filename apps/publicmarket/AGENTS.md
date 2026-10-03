<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project architecture

Read the repository's `../../docs/architecture.md` before changing project organization or routing. It records the October 2 single-repository structure and preserves the user's October 1 blueprint.

- Public Market owns the shared entry point and selector. Each venue owns its complete portal in its sibling app directory.
- Keep shared entry UI in `src/features/admin-entry`, per-brand settings and fonts in `src/brands`, and route files in `src/app`.
- Public venue navigation and admin selection must use the shared brand registry.
- Preserve the approved login screens. Their native forms submit to the selected venue's prefixed authentication API and enter its live portal.
- Keep venue rewrites in `beforeFiles` so RSC segment-prefetch requests reach the correct app. Preserve the four existing Vercel projects, independent content stores and environment settings.
