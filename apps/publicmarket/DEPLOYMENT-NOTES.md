# Public Market V2 production homepage

Requested source: http://127.0.0.1:3015/ from `PUBLICMARKET-V2-LOCAL`.
Production target: https://fwpublicmarket.com/ on the existing `fwpublicmarket` Vercel project.

This release starts from current production commit `3f70edc6b06adf965753950c22dc4db97171c9ce` and replaces only the homepage components and layout with V2. It preserves the current brand registry, admin selector and login pages, venue proxy routes, original assets, and Vercel Analytics.

The local V2 and V3 folders remain unchanged. No V3 copy, hero overlay, event form, or layout is included.

The production newsletter form uses the existing subscribers store, with explicit error handling when its database is unavailable. Vercel currently has no production environment variables configured, including `POSTGRES_URL`. The live form therefore reports that email signup is temporarily unavailable; it cannot persist subscribers until storage is configured. No test subscriber or outbound email is needed for this release.

Previous production deployment: `dpl_122nxCk53iwYSikUiKw837tfmGBy` at `fwpublicmarket-2gu6zcaru-alphacotv-gmailcom-s-team.vercel.app`.

Build, release, and verification details will be recorded after deployment.
