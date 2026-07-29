# Fort Worth Public Market Collective

✅ **This is the LIVE repo — keep this one.**

One landmark, three concepts: **Public Market Cafe** (day market &
brunch, north hall), **Madrone** (fine dining, center hall), and
**Willow** (bar, south hall) — inside the historic 1930 Public Market
building at 1400 Henderson Street, Fort Worth.

- **Live site:** https://dfwpmc.vercel.app (future home: fwpublicmarket.com)
- **Deploys:** every push to `main` auto-deploys via Vercel
- **Stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase · Tock (reservations) · Tipsy (events)

## Structure

```
src/
  lib/concepts.ts        Concept registry — names, themes, menus, hours, Tock links
  app/page.tsx           Collective landing (interactive building facade)
  app/[concept]/page.tsx Themed sub-sites: /willow, /madrone, /cafe
  app/events/page.tsx    Private events (Tipsy embed)
  components/building-hero.tsx  Hover-zone facade component
docs/PROJECT-NOTES.md    Decisions & pending items
supabase/migrations/     Schema for the upcoming admin/content layer
```

## Local development

```bash
npm install
npm run dev
```
