# Public Market repository

This repository owns four independently deployed Next.js applications in `apps/`. Read `docs/architecture.md` before changing organization or routing and each app's local instructions before changing its code. Read the installed Next.js guides for affected APIs; these apps use Next.js 16.2.4.

- The hub in `apps/publicmarket` owns the website entry, selector, approved login screens and shared brand registry. Preserve Willow → Madrone → PM cafe selector order.
- Each venue owns its complete public website and admin portal in its app directory. Keep package locks, environment files, session secrets, cookie paths, content and uploads independent.
- Keep the hub's three external venue rewrites in `beforeFiles`, including nested asset and API paths. This ordering handles Next.js RSC segment prefetches correctly.
- Vercel uses four existing projects connected to this repository, each with its app directory as Root Directory and `main` as production branch. Preserve existing domains, environment variables and private Blob stores. Keep `sourceFilesOutsideRootDirectory: false` while the apps are self-contained, so Next.js tracing uses the app build root.
- Provider integrations remain disconnected behind the venue preview guards. Keep Callidus separate. A repository reorganization does not authorize enabling integrations or replacing persistent content.
- Preserve the approved UI, all page routes and the selector/login flow. The three former venue repositories are historical sources; current edits belong in this repository.
- Keep credentials, `.env.local`, `.vercel`, local records, dependencies, builds and deployment receipts out of Git. Preserve unrelated dirty checkouts and existing local previews.
