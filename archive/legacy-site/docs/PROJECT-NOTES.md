# FW Public Market Collective — Project Notes

Working notes for the build. Source of truth for decisions made in
planning conversations.

## Project

- **Deployed at**: fwpublicmarket.com (Vercel)
- **One app, four views**: collective landing + three concept sub-sites
- **Concepts & building zones** (per ID-102 Level 1 floor plan):
  - **Public Market Cafe** — day market & brunch — north hall (bakery
    glass enclosure, espresso)
  - **Madrone** — fine dining, dinner — center hall; private dining room
    behind a hidden door; entrance off the east historical corridor
  - **Willow** — high-end bar — south hall; Willow Bar, foyer, VIP area
    with dedicated restroom (southeast)
  - Kitchen west (shared) · entry & historical corridor east · tower at
    the northeast corner
- **Concept domains 301-redirect into paths**, e.g.
  barwillow.com → fwpublicmarket.com/willow
- **Landing page**: interactive dusk rendering of the building; hover
  zones map to physical locations (tower/north = Cafe, center = Madrone,
  south = Willow), expand with content, click through to the concept page

## Reservations & bookings

- **Table reservations**: Tock, per concept (no custom booking system)
- **Private events page embed** (Tipsy):

  ```html
  <iframe
    src="https://tipsyapp.io/embed/fort-worth-public-market-collective"
    style="width:100%;height:1100px;border:0;"
    loading="lazy"
    title="Event booking form"
  ></iframe>
  ```

## Admin

- `/admin`, gated by Supabase Auth
- Manages: menus (all concepts), hours, site copy, gallery images
  (Supabase Storage), announcements/events, landing hotspot content,
  Tock links

## Pending / to bring in

- Repo access to 2 other projects with fully built functions (owner to
  grant)
- High-res building rendering for the landing hero (current copy is
  ~750px; confirm usage rights with BOKA Powell)
- Final path + domain for the cafe concept
- Willow brand reference: barwillow.com (blocked from this environment's
  network — needs allowlist entry or screenshots)
