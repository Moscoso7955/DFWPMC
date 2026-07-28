# DWFPMC — Restaurant Website

A customer-facing restaurant website built with **Next.js (App Router)**,
**Tailwind CSS v4**, and **Supabase**. It ships with pages for the home,
menu, about, and reservations, and is fully config-driven so it can be
rebranded for any restaurant by editing two files.

## Running locally

```bash
npm install
npm run dev
```

The site works out of the box with **no configuration** — the menu is served
from local seed data and reservation requests are accepted (but not stored)
until Supabase is connected.

## Connecting Supabase

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/0001_init.sql` (SQL editor or
   `supabase db push`). It creates `menu_categories`, `menu_items`, and
   `reservations`, enables RLS (public read for menu, insert-only for
   reservations), and seeds the menu.
3. Copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Project Settings → API.

Once configured, the menu is read live from Supabase and reservation
requests land in the `reservations` table (readable from the Supabase
dashboard, with a `status` field for confirming/cancelling).

## Rebranding for another restaurant

All identity lives in two places:

- `src/lib/site-config.ts` — name, tagline, address, phone, email, hours,
  social links.
- Menu content — either edit the seed rows in
  `supabase/migrations/0001_init.sql` (when using Supabase) or
  `src/lib/menu-data.ts` (local fallback).

Colors and fonts are defined once in `src/app/globals.css`
(`@theme` tokens) and `src/app/layout.tsx` (Google fonts).

## Structure

```
src/
  app/
    page.tsx               Home (hero, featured dishes, hours/location)
    menu/page.tsx          Full menu, grouped by category
    about/page.tsx         Story page
    reservations/          Reservation form (server action → Supabase)
  components/              Header, footer
  lib/
    site-config.ts         Branding & contact info
    data.ts                Data access (Supabase with seed-data fallback)
    menu-data.ts           Local seed menu
    supabase.ts            Supabase client factory
supabase/migrations/       Database schema + seed
```

## Deploying

Deploys cleanly to Vercel: import the repo, set the two `NEXT_PUBLIC_*`
environment variables, and ship.
