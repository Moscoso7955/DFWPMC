# DFWPMC

Repository for the next Fort Worth Public Market Collective build. Place the replacement application at the repository root.

## Archived site

The previous marketing site is preserved unchanged in [`archive/legacy-site/`](archive/legacy-site/), including its source, assets, documentation, database migration, and dependency lockfile.

- Source commit: [`3876dbeb2e7058bbadea56a041d00a89aa380d3e`](https://github.com/Moscoso7955/DFWPMC/commit/3876dbeb2e7058bbadea56a041d00a89aa380d3e).
- Archived: October 2, 2026.
- Original setup instructions: [`archive/legacy-site/README.md`](archive/legacy-site/README.md).

To run the archived site locally:

```sh
cd archive/legacy-site
npm ci
npm run dev
```

## Deployment during replacement

The root `vercel.json` skips Git-triggered builds while the root has no `package.json`, preserving the currently published deployment during the transition. Adding a root `package.json` allows builds to resume. Review or replace this temporary guard when adding the new application's deployment configuration.

The root `.gitignore` retains the previous project's ignore rules. Keep the archived snapshot separate from changes to the replacement application.
