# PUBLICMARKET Borderless Layout QA

## **Comparison Target**

- Source visual truth: `/tmp/publicmarket-no-red-frames-desktop-before.jpg` and `/tmp/publicmarket-no-red-frames-mobile-before.jpg`, plus the user's direction to remove every red frame and make imagery fill each hero and venue-button area.
- Final browser-rendered implementation: `/tmp/publicmarket-no-red-frames-desktop-final-fresh.jpg` and `/tmp/publicmarket-no-red-frames-mobile-final-fresh.jpg` at `http://127.0.0.1:3000/`.
- Full-view comparisons: `/tmp/publicmarket-no-red-frames-desktop-comparison.png` and `/tmp/publicmarket-no-red-frames-mobile-comparison.png`.
- Focused comparisons: `/tmp/publicmarket-no-red-frames-desktop-focus.png` and `/tmp/publicmarket-no-red-frames-mobile-focus.png`.
- Navigation-state evidence: `/tmp/publicmarket-no-red-frames-mobile-drawer-final.jpg`.
- State: homepage at rest on desktop and mobile; `/menu` drawer opened and closed for interaction verification.
- Normalization: desktop source and final captures are 1094 x 847 pixels from a 1094 x 859 CSS viewport at 1x. Mobile source and final captures are 390 x 844 pixels from a 390 x 844 CSS viewport at 1x.

## **Findings And Iteration History**

- Earlier [P1] the 3px deep-red frame surrounded the site shell, divided the desktop hero, outlined the fixed mobile venue menu, and separated its three rows.
  - Fix: changed the shared frame token to zero width and removed the remaining direct deep-red border declarations. The final browser scan found zero visible deep-red borders across `/`, `/menu`, `/calendar`, `/private-events`, `/reservations`, `/story`, `/visit`, `/contact`, and `/careers`.
- Earlier [P2] the desktop and mobile hero layers used negative insets to bleed beneath the former borders. The public mobile logo link also occupied a 24px line box above the first hero image.
  - Fix: set both hero image layers to zero inset, matched the mobile menu token to its 300px rendered height, and positioned the mobile logo link outside document flow while retaining the accepted 390 x 278.570px logo treatment.
- Post-fix evidence: the desktop hero and venue section both measure 1094px wide from x=0. On mobile, the hero image begins at y=0, ends at y=544, and the three 390 x 100px venue rows continue from y=544 without borders, gaps, or horizontal overflow.

## **Visual Comparison Evidence**

- The desktop comparison places the framed source on the left and the borderless result on the right. The outer frame, photo/logo divider, hero/menu divider, and card framing are gone; the hero and venue imagery now meet every section edge.
- The mobile comparison confirms removal of the outer frame, top strip, menu frame, and row separators. The Phoebe logo keeps its approved scale while the hero image fills the complete 390 x 544px area.
- The focused desktop and mobile comparisons make the removed hero/menu and venue-row framing readable at equal scale.

## **Required Fidelity Surfaces**

- Fonts and typography: all font families, logo assets, weights, sizes, and hierarchy remain unchanged.
- Spacing and layout rhythm: removing border width expands visual content to section edges. Desktop venue cards remain equal squares; mobile venue rows remain equal 100px bands.
- Colors and visual tokens: the deep-red brand surfaces and text accents remain. The implementation removes deep-red border and outline usage while preserving neutral accessibility outlines.
- Image quality and asset fidelity: the original hero photographs and supplied venue SVG logos remain in use. Hero and button backgrounds use full-area cover treatment with zero inset.
- Copy and content: route labels, venue destinations, accessible names, and page content remain unchanged.

## **Functional And Responsive Checks**

- Browser measurements found zero horizontal overflow and zero visible deep-red borders on all nine public routes at 390px width.
- The interior-page drawer opened and closed successfully. Its outer border and all nine link separators render at 0px.
- Fresh-server browser checks found no console errors or warnings.
- `git diff --check`, TypeScript, and the production build passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

## **Implementation Checklist**

- Remove the red frame system across public and administrative surfaces.
- Make desktop and mobile hero imagery fill its complete section.
- Make all three desktop and mobile venue buttons touch edge-to-edge.
- Preserve approved imagery, logos, links, hover treatments, and responsive proportions.

final result: passed

# PUBLICMARKET Branded Side Drawer QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 7.18.19 PM.png`, `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.23.23 PM.png`, and `/Users/rtm/Desktop/PUBLIC MARKET - MAIN/Fonts/Storica-Regular.ttf`.
- Source screenshot dimensions: 818 x 1618 pixels at 2x density, normalized to 409 x 809 CSS pixels and top-cropped to 409 x 780 pixels to match the in-app browser capture surface.
- Final rendered captures: `/tmp/publicmarket-drawer-qa/mobile-final.png` at a 409 x 809 CSS viewport with a 409 x 780 browser capture, and `/tmp/publicmarket-drawer-qa/desktop-final.png` at a 1094 x 859 CSS viewport with a 1094 x 780 browser capture.
- Full-view side-by-side evidence: `/tmp/publicmarket-drawer-qa/source-vs-mobile-final.png`.
- Focused expanded-state evidence: `/tmp/publicmarket-drawer-qa/more-before-vs-final.png`.
- State: homepage drawer open with the seven requested top-level options; the focused comparison also covers the expanded `More` state.

## **Findings And Iteration History**

- Earlier [P2] the first expanded `More` treatment placed all secondary destinations below the viewport, so a user could activate the control without immediately seeing its contents.
  - Fix: the expanded state now switches the seven primary rows to compact fixed tracks and tightens the secondary rows. At the 390 x 844 test viewport, the drawer reports an 844px client height and 844px scroll height, and the final secondary link ends at 795.09px.
  - Post-fix visual evidence: the right side of `/tmp/publicmarket-drawer-qa/more-before-vs-final.png` shows `More`, Calendar, Book an Event, Reservations, and Careers inside the drawer viewport.
- No actionable P0, P1, or P2 differences remain. The final panel preserves the source drawer's left-side placement, centered close control, approximately 60% mobile width, and evenly paced navigation while applying the requested Public Market brand system and replacement copy.

## **Required Fidelity Surfaces**

- Fonts and typography: the browser loads the supplied 114KB `Storica-Regular.ttf`, reports `Storica, Georgia, serif` as the computed drawer family, and confirms the Storica face is available through `document.fonts`. Venue subtitles use the same family at a smaller optical scale.
- Spacing and layout rhythm: the mobile panel measures 245.4px at the 409px target width, closely matching the normalized source panel's 240px width. The close control remains centered, the three venue links retain two-line hierarchy, and the four remaining top-level options use the same row system. Desktop caps the panel at 480px and has no horizontal overflow.
- Colors and visual tokens: the drawer computes to `rgb(53, 87, 72)` (`#355748`) and its text/close control compute to `rgb(234, 234, 232)` (`#EAEAE8`). These values match the supplied Public Market green and the existing bone-white brand token.
- Image quality and asset fidelity: the drawer introduces no generated or approximate image assets. The existing historic hero and venue imagery remain untouched and fill the visible area beside the panel.
- Copy and content: the seven top-level labels are Willow / Cocktail Bar & Lounge, Madrone / Fine Texas Dining, Public Market / Cafe & Goods, Our Story, Contact Us, Location, and More. Capitalization and subtitles match the user's supplied wording.

## **Functional And Responsive Checks**

- Venue links point to the three running local projects on ports 3002, 3001, and 3003. Our Story, Contact Us, and Location point to `/story`, `/contact`, and `/visit`.
- `More` expands the retained secondary routes for Calendar, Book an Event, Reservations, and Careers, and the expanded panel fits the tested mobile viewport.
- Opening the drawer locks body scrolling. The closed drawer is inert, Escape closes it, and focus returns to the hamburger control.
- Fresh desktop and mobile checks found no horizontal overflow, no application console errors or warnings, and successful HTTP 200 responses for the homepage and Storica font.
- React review found static menu data hoisted outside the component, a stable close callback, complete effect dependencies, and appropriate `aria-expanded`, `aria-controls`, `aria-hidden`, and `inert` states.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Mobile Scroll and Holding Sections QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.42.30 PM.png`, `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.42.35 PM.png`, `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.42.49 PM.png`, and `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.43.00 PM.png`.
- Final mobile browser captures: `/tmp/publicmarket-scroll-qa/mobile-top-clean.png`, `/tmp/publicmarket-scroll-qa/mobile-scrolled-clean.png`, and `/tmp/publicmarket-scroll-qa/mobile-holding-end.png` at a 390 x 844 CSS viewport.
- Desktop continuity capture: `/tmp/publicmarket-scroll-qa/desktop-top.png` at a 1440 x 900 CSS viewport.
- Focused source-versus-rendered comparison: `/tmp/publicmarket-scroll-qa/comparison/source-vs-implementation.png`.
- Source dimensions: 2058 x 1314, 2050 x 1034, 2052 x 1564, and 2054 x 690 pixels. Each browser-rendered section preserves its source aspect ratio at 390px width.

## **Findings And Iteration History**

- Earlier [P1] the running development server retained stale CSS and its original public-file manifest, so the venue menu still reported `position: fixed` and the four new files returned 404 responses.
  - Fix: stopped the stale instance, built from a clean `.next` state, and restarted the local server. All four media assets now load at their natural dimensions.
- No actionable P0, P1, or P2 differences remain. The source screenshots render edge-to-edge without borders, gaps, cropping, or aspect-ratio distortion.
- The Next.js development-tools badge overlaps the lower-left corner of one QA capture. It belongs to the local development runtime and is excluded from page-design findings.

## **Required Fidelity Surfaces**

- Scroll-state header: 76px tall with a 70 x 70px seal at `scrollY=0`; 38px tall with a 35 x 35px seal after scrolling. Its computed position remains `sticky` at top 0.
- Venue links: the three existing mobile cards remain exactly 100px tall and 300px total. Their computed position is `relative`, so they leave the viewport with the rest of the page.
- Holding-section order: historic landmark, original glory/community, cultural and culinary hub, then restoration signup.
- Media sizing at 390px: 249.008px, 196.711px, 297.25px, and 131.008px tall. Each image reports complete loading and its expected natural dimensions.
- Desktop continuity: header remains 92px and `relative`; the three venue cards remain equal 480 x 480px squares at 1440px width.

## **Functional And Responsive Checks**

- Browser measurements confirmed the first holding section begins at y=844 in the mobile rest state, directly after the 76px header, 468px hero, and 300px venue menu.
- At `scrollY=522`, the header is exactly 38px high and pinned to y=0 while the venue menu has already moved above the viewport.
- At the maximum mobile scroll position, all four holding sections appear in their requested order and the restoration signup block closes the page.
- The hamburger still opens and closes the existing drawer from the compact 38px header state.
- Fresh-server browser logs contain no errors or warnings from application code.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Top-Bar Hamburger QA

## **Comparison Target**

- Source visual truth: `/tmp/publicmarket-hamburger-before-desktop.png`, representing the approved Public Market header before the requested menu control.
- Rendered implementation: `/tmp/publicmarket-hamburger-final-desktop.png` at a 1094 x 859 CSS viewport and `/tmp/publicmarket-hamburger-final-mobile.png` at a 390 x 844 CSS viewport.
- Density normalization: source and implementation captures are 1x browser captures whose pixel dimensions match their CSS viewport dimensions.
- State: homepage at rest, plus the existing site drawer opened and closed from the new hamburger.
- Full-view comparison: `/tmp/publicmarket-hamburger-before-after.png`.
- Focused header comparison: `/tmp/publicmarket-hamburger-header-before-after.png`.

## **Findings**

- No actionable P0, P1, or P2 differences remain. The new three-line control sits on the left side of the Bone White header without moving the centered seal, changing the hero crop, or changing the three venue cards.
- Desktop placement: 34 x 28px at x=28.438px and y=32px, vertically centered within the 92px header.
- Mobile placement: 34 x 28px at x=18px and y=24px, vertically centered within the 76px header.
- The button uses the supplied Public Market green `#355748`, matching the seal.

## **Required Fidelity Surfaces**

- Fonts and typography: unchanged.
- Spacing and layout rhythm: the centered seal retains its existing desktop and mobile rectangles; the button occupies the previously empty left header area.
- Colors and visual tokens: the hamburger maps to the existing `--public-market-green` token.
- Image quality and asset fidelity: the seal, historic hero, and venue assets remain unchanged.
- Copy and content: the existing drawer labels and destinations remain unchanged; the control has an accessible `Open menu` label and expanded state.

## **Interaction And Responsive Checks**

- The hamburger opened the drawer to 240px on desktop and 195px on mobile, updated `aria-expanded`, and closed from the drawer close button.
- Fresh-browser testing found no console errors or warnings.
- Desktop and mobile checks found no horizontal overflow. Mobile venue rows remain exactly 100px each.
- React review found no conditional hook usage, unstable non-primitive props, or new rendering overhead beyond reusing the existing drawer component.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Top Bar and Historic Hero QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/PUBLIC MARKET - MAIN/Logos/PM-Seal.ai`, `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.23.23 PM.png`, `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.23.27 PM.png`, and `/Users/rtm/Desktop/Screenshot 2026-08-10 at 6.27.10 PM.png`.
- Final browser captures: `/tmp/publicmarket-final-desktop.png` at 1094 x 859 and `/tmp/publicmarket-final-mobile.png` at 390 x 844.
- Side-by-side inspection inputs: `/tmp/publicmarket-hero-reference-vs-implementation.png` and `/tmp/publicmarket-logo-reference-vs-implementation.png`.
- Target state: Public Market header and historic hero at rest on desktop and mobile, with the existing three venue links immediately below the hero.

## **Findings And Iteration History**

- Earlier [P1] fresh JSX loaded against stale development CSS, which made the new seal fill the page and retained the old split hero geometry.
  - Fix: restarted the Next.js development server from a clean `.next` directory and rechecked both breakpoints.
- Earlier [P2] the mobile venue grid could exceed its 300px menu token near the 760px boundary because intrinsic logo dimensions influenced row sizing.
  - Fix: gave the fixed mobile menu an explicit 300px height and three equal fractional rows. Browser measurements now report exactly 100px for every row at 390px and 760px widths.
- Crop review compared 25%, 38%, and 50% vertical focal positions. The 25% desktop position preserves the tower cap and vertical PUBLIC MARKET sign within the existing 415.719px hero height. The centered mobile crop preserves the complete facade at 390 x 468px.

## **Required Fidelity Surfaces**

- Header surface: `#EAEAE8`, matching the supplied Bone White swatch.
- Seal color: every vector path uses `#355748`, matching the supplied Green swatch.
- Logo geometry: the supplied Illustrator seal was converted directly to SVG; no mark was redrawn.
- Hero asset: the supplied 1214 x 1554 historic photo fills both hero containers with `cover` treatment and no framing.
- Removed marks: the browser DOM contains zero `.brand-mark`, `.mobile-brand-mark`, or `.hero-panel--brand` elements at desktop and mobile breakpoints.

## **Functional And Responsive Checks**

- Desktop at 1094 x 859: 92px header, 415.719px hero, three equal 364.664px venue squares, and no horizontal overflow.
- Mobile at 390 x 844: 76px header, 468px hero, 300px fixed venue menu, three equal 100px rows, and no horizontal overflow.
- Breakpoint checks at 761px, 760px, and 620px found no horizontal overflow; the corrected mobile rows remain equal at the 760px boundary.
- Final browser run found no console errors. Homepage, SVG logo, and hero image each returned HTTP 200.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Sticky Replacement Venue Buttons QA

## **Comparison Target**

- Source visual truth: the existing main venue buttons captured at `/tmp/publicmarket-sticky-qa/desktop-main-buttons-before.png` and `/tmp/publicmarket-sticky-qa/mobile-before.png`.
- Final rendered states: `/tmp/publicmarket-sticky-qa/desktop-sticky-final.png` at a 1094 x 859 CSS viewport and `/tmp/publicmarket-sticky-qa/mobile-sticky-final.png` at a 390 x 844 CSS viewport, both at 1x density.
- Full focused comparisons: `/tmp/publicmarket-sticky-qa/comparison/desktop-main-vs-sticky-final.png` and `/tmp/publicmarket-sticky-qa/comparison/mobile-main-vs-sticky-final.png`.
- State coverage: replacement menu hidden before the main venue-section midpoint crosses the viewport top; replacement menu visible after that midpoint passes the top; return-scroll dismissal verified.

## **Findings And Iteration History**

- Earlier [P2] the compact mobile Public Market Café logo box extended 16.55px beneath its 50px replacement row, clipping the `Cafe & Goods` tagline.
  - Fix: constrained that compact logo to 44px while retaining `object-fit: contain`. The final browser measurement places it from y=797px to y=841px inside its y=794px to y=844px row, and the final comparison shows the complete lockup.
- No actionable P0, P1, or P2 differences remain. The final replacement buttons reuse the exact backgrounds, overlays, logo assets, order, and link destinations from the main venue buttons.
- The round Next.js development badge in the lower-left corner belongs to the local development runtime and is excluded from page-design findings.

## **Required Fidelity Surfaces**

- Fonts and typography: the venue names remain accessible hidden headings; the visible branding continues to come from the original supplied SVG logo assets.
- Spacing and layout rhythm: desktop replacement buttons stay in one edge-to-edge row and measure 121.555px high against 364.664px main buttons, an exact 1:3 ratio. Mobile replacements remain stacked and measure three 50px rows against three 100px main rows, an exact 1:2 ratio.
- Colors and visual tokens: existing image overlays and brand colors remain unchanged; replacement menus add no borders, gaps, padding, or new color treatments.
- Image quality and asset fidelity: every replacement uses the same raster background and SVG logo as its corresponding main button, with cover/contain behavior preserved.
- Copy and content: order remains Willow, Madrone, Public Market Café from left to right on desktop and top to bottom on mobile. All three destinations and accessible labels match the main controls.

## **Functional And Responsive Checks**

- The midpoint sentinel reports positive viewport coordinates before the 50% threshold and negative coordinates afterward. The replacement menu appears only in the latter state and hides when the user scrolls back above it.
- A single fast scroll from the top to the page end also activates the replacement menu, covering jump-scroll and momentum-scroll behavior.
- Desktop replacement menu computes to `position: fixed`, bottom 0, and one-third of the main button height. Mobile computes to `position: fixed`, bottom 0, 150px total, and three exact 50px rows.
- Breakpoint verification at 760px and 761px found the requested stacked and row layouts respectively, with zero horizontal overflow.
- Hidden-state controls use `visibility: hidden`, disabled pointer events, and `aria-hidden=true`; visible-state controls expose the three correct links.
- Fresh browser logs contain no errors or warnings from application code.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Drawer Close Alignment QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 7.48.27 PM.png` plus the instruction to move the centered close control to the drawer's right side.
- Source dimensions: 742 x 1624 pixels at 2x density, normalized to a 371 x 812 CSS viewport and top-cropped to 371 x 780 pixels to match the in-app browser capture surface.
- Final rendered mobile capture: `/tmp/publicmarket-drawer-x-qa/mobile-final-clean.png` from a 371 x 812 CSS viewport, captured at 371 x 780 pixels.
- Final rendered desktop capture: `/tmp/publicmarket-drawer-x-qa/desktop-final.png` from a 1094 x 859 CSS viewport, captured at 1094 x 780 pixels.
- Full-view side-by-side evidence: `/tmp/publicmarket-drawer-x-qa/source-vs-final.png`.
- State: homepage drawer open, `More` collapsed, close control visible.

## **Findings And Iteration History**

- Earlier [P2] the supplied screenshot showed the X centered over the drawer, which conflicted with the requested right-side alignment.
  - Fix: changed `.drawer-close` from centered self-alignment to end alignment and gave it the same responsive right inset used by the drawer links.
  - Post-fix evidence: the final mobile close control has a 24px right inset inside a 222.59px drawer; desktop has a 44px right inset inside the 480px drawer. `/tmp/publicmarket-drawer-x-qa/source-vs-final.png` shows the visible movement from center to right.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: Storica typography, sizes, wrapping, line height, and hierarchy remain unchanged.
- Spacing and layout rhythm: only the close control's horizontal alignment changed. Its 52px control size, 92px header row, vertical position, and X geometry remain unchanged.
- Colors and visual tokens: the Public Market green drawer and bone-white close control remain unchanged.
- Image quality and asset fidelity: hero and venue imagery remain untouched; this change adds no generated or substitute assets.
- Copy and content: all drawer labels, subtitles, order, and destinations remain unchanged.

## **Functional And Responsive Checks**

- The drawer still opens and closes normally, body scroll locking remains intact, and the close control retains its accessible label.
- Mobile and desktop checks found zero horizontal overflow.
- The final browser run found no application console errors or warnings.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Solid Madrone Sticky Button QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 7.23.01 PM.png`, a 488 x 330 pixel palette reference, plus the instruction to change only Madrone's replacement sticky button.
- The visible Berry swatch was sampled at RGB 111, 42, 48, yielding the exact CSS color `#6f2a30`.
- Prior sticky-state references: `/tmp/publicmarket-sticky-qa/desktop-sticky-final.png` and `/tmp/publicmarket-sticky-qa/mobile-sticky-final.png`.
- Final desktop capture: `/tmp/publicmarket-madrone-sticky-qa/desktop-final.png` at a 1094 x 780 CSS viewport and 1x density.
- Final mobile capture: `/tmp/publicmarket-madrone-sticky-qa/mobile-final.png` at a 390 x 780 CSS viewport and 1x density.
- Focused visual comparisons: `/tmp/publicmarket-madrone-sticky-qa/swatch-vs-final.png` and `/tmp/publicmarket-madrone-sticky-qa/mobile-before-vs-final.png`.
- State: homepage scrolled past the midpoint sentinel so the replacement sticky venue menu is visible.

## **Findings And Iteration History**

- Earlier [P2] the sticky Madrone card inherited its photographic hero background, translucent dark overlay, and full-size sticky logo treatment.
  - Fix: the sticky variant now omits Madrone's image and overlay nodes, applies the sampled solid Berry token at full opacity, and uses centered logo dimensions exactly half of its prior sticky dimensions.
  - Desktop logo dimensions changed from 76% x 48% to 38% x 24%; mobile changed from 53% x 70% to 26.5% x 35%.
  - Post-fix evidence: `/tmp/publicmarket-madrone-sticky-qa/swatch-vs-final.png` confirms the color treatment, while `/tmp/publicmarket-madrone-sticky-qa/mobile-before-vs-final.png` confirms the image removal and reduced logo scale.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: the original Madrone SVG logo and its fill color remain unchanged.
- Spacing and layout rhythm: the logo is centered inside the sticky card at desktop and mobile sizes; measured center deltas were at or below 0.004 CSS pixels.
- Colors and visual tokens: the sticky Madrone card uses solid `#6f2a30`, computed as `rgb(111, 42, 48)`, with opacity `1` and `background-image: none`.
- Image quality and asset fidelity: the sticky Madrone card contains zero background-image nodes and zero overlay nodes. The main Madrone card retains both its image and overlay.
- Copy and content: venue labels, accessible names, link targets, ordering, and the non-sticky cards remain unchanged.

## **Functional And Responsive Checks**

- The 50% midpoint trigger still reveals the sticky replacement menu, and the Madrone link remains clickable.
- Desktop, mobile, and the reset 1280 x 720 handoff viewport show no horizontal overflow.
- Fresh browser logs contain no application errors or warnings.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Solid Willow And Cafe Sticky Buttons QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 7.23.34 PM.png`, a 278 x 338 pixel Dark Green palette reference, and `/Users/rtm/Desktop/Screenshot 2026-08-10 at 7.22.42 PM.png`, a 292 x 368 pixel Black palette reference.
- The source labels define Dark Green as RGB 34, 55, 43 (`#22372b`) and Black as RGB 13, 13, 13 (`#0d0d0d`).
- Prior sticky-state reference: `/tmp/publicmarket-madrone-sticky-qa/desktop-final.png` and `/tmp/publicmarket-madrone-sticky-qa/mobile-final.png`.
- Final rendered desktop capture: `/tmp/publicmarket-all-sticky-solid-qa/desktop-final.png` from a 1094 x 780 CSS viewport at 1x density.
- Final rendered mobile capture: `/tmp/publicmarket-all-sticky-solid-qa/mobile-final.png` from a 390 x 780 CSS viewport at 1x density.
- Full and focused comparison evidence: `/tmp/publicmarket-all-sticky-solid-qa/swatches-vs-final.png`, `/tmp/publicmarket-all-sticky-solid-qa/desktop-before-vs-final.png`, and `/tmp/publicmarket-all-sticky-solid-qa/mobile-before-vs-final.png`.
- State: homepage scrolled past the venue-menu midpoint so all three replacement sticky buttons are visible.

## **Findings And Iteration History**

- Earlier [P2] the sticky Willow and Public Market Cafe cards inherited their photographic hero images, translucent overlays, and full-size sticky logo treatments.
  - Fix: all sticky variants now omit image and overlay nodes. Willow uses solid Dark Green and Public Market Cafe uses solid Black, both at full opacity.
  - Willow's desktop logo changed from 72% x 48% to 36% x 24%; mobile changed from 52% x 70% to 26% x 35%.
  - Public Market Cafe's desktop logo changed from 80% x 48% to 40% x 24%; mobile changed from 58% x 44px to 29% x 22px.
  - Post-fix evidence: the focused comparisons show both photographic treatments replaced by solid palette colors, with centered logos at half their prior sticky dimensions.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: the supplied Willow and Public Market Cafe SVG logo assets and their original fills remain unchanged.
- Spacing and layout rhythm: both logos are centered in their sticky cards at desktop and mobile sizes; measured center deltas were at or below 0.004 CSS pixels.
- Colors and visual tokens: Willow computes to `rgb(34, 55, 43)` and Public Market Cafe computes to `rgb(13, 13, 13)`, each with opacity `1` and `background-image: none`.
- Image quality and asset fidelity: all three sticky cards contain zero background-image and zero overlay nodes. The three main venue cards retain their original hero image and overlay nodes.
- Copy and content: venue labels, accessible names, link destinations, and venue order remain unchanged.

## **Functional And Responsive Checks**

- The 50% midpoint trigger still reveals the three sticky buttons, and all three venue links remain clickable.
- Desktop and mobile verification found zero horizontal overflow.
- Fresh browser logs contain no application errors or warnings.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Equal Sticky Logo Width QA

## **Comparison Target**

- Source visual truth: the approved solid-color sticky button state, using Madrone's rendered logo width as the exact alignment target.
- Prior desktop capture: `/tmp/publicmarket-all-sticky-solid-qa/desktop-final.png` at a 1094 x 780 CSS viewport and 1x density.
- Prior mobile capture: `/tmp/publicmarket-all-sticky-solid-qa/mobile-final.png` at a 390 x 780 CSS viewport and 1x density.
- Final desktop capture: `/tmp/publicmarket-all-sticky-solid-qa/desktop-width-match-final2.png` at a 1094 x 780 CSS viewport and 1x density.
- Final mobile capture: `/tmp/publicmarket-all-sticky-solid-qa/mobile-width-match-final.png` at a 390 x 780 CSS viewport and 1x density.
- Focused side-by-side comparison evidence: `/tmp/publicmarket-all-sticky-solid-qa/desktop-width-before-vs-final.png` and `/tmp/publicmarket-all-sticky-solid-qa/mobile-width-before-vs-final.png`.
- State: homepage scrolled past the midpoint sentinel with all three replacement sticky buttons visible.

## **Findings And Iteration History**

- Earlier [P2] the three differently proportioned SVG viewboxes made equal CSS boxes produce unequal visible artwork widths.
  - Prior desktop visible widths were Willow 110px, Madrone 135px, and Public Market Cafe 75px.
  - Prior mobile visible widths were Willow 66px, Madrone 83px, and Public Market Cafe 58px.
  - Fix: assigned sticky-only per-logo widths and automatic intrinsic heights, compensating for each SVG's aspect ratio and transparent viewbox margins.
  - Post-fix pixel measurement found exactly 135px of visible artwork for all three logos on desktop and exactly 83px for all three on mobile.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: all three supplied SVG logo assets and their fills remain unchanged.
- Spacing and layout rhythm: Willow and Public Market Cafe remain centered while matching Madrone's exact visible width. Their natural logo proportions remain intact.
- Colors and visual tokens: Dark Green, Berry, and Black sticky backgrounds remain unchanged and fully opaque.
- Image quality and asset fidelity: scaling remains vector-based with no raster substitution, distortion, cropping, or transparency halo.
- Copy and content: venue labels, accessible names, link destinations, ordering, and the main venue buttons remain unchanged.

## **Functional And Responsive Checks**

- The sticky trigger and all three venue links still work normally.
- Desktop and mobile checks found zero horizontal overflow.
- Fresh browser logs contain no application errors or warnings.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Drawer-Styled Return Home QA

## **Comparison Target**

- Drawer styling reference: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 10.28.19 PM.png`, 934 x 362 pixels.
- Earlier Return Home reference: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 10.28.13 PM.png`.
- Final desktop capture: `/tmp/publicmarket-return-home-qa/desktop-final.png` from a 1094 x 780 CSS viewport at 1x density.
- Final mobile capture: `/tmp/publicmarket-return-home-qa/mobile-final.png` from a 390 x 780 CSS viewport at 1x density.
- Focused comparison evidence: `/tmp/publicmarket-return-home-qa/drawer-vs-return-home.png` and `/tmp/publicmarket-return-home-qa/before-vs-final.png`.

## **Findings And Iteration History**

- Earlier [P2] the shared Return Home bar used the legacy yellow background, black text, and monospace site font, which diverged from the current drawer treatment.
  - Fix: the shared `.page-menu` now uses Storica, Public Market green (`#355748`), and bone white (`#eaeae8`).
  - Fix: hover and keyboard-focus states invert to a bone-white background with Public Market green text, matching the drawer interaction pattern.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: computed font family is `Storica, Georgia, serif` on desktop and mobile.
- Spacing and layout rhythm: the established fixed 50-pixel bar height, centered label, arrow spacing, and link hit area remain unchanged.
- Colors and visual tokens: computed default colors are `rgb(53, 87, 72)` and `rgb(234, 234, 232)`; hover computes to the exact inverse pair.
- Image quality and asset fidelity: no image assets were added or altered for this control.
- Copy and content: the arrow and `Return Home` label remain unchanged.

## **Functional And Responsive Checks**

- The shared control was verified on `/menu`, `/calendar`, `/private-events`, `/contact`, `/story`, `/reservations`, `/careers`, and `/visit`.
- The Return Home link navigates to `/` successfully.
- Desktop and mobile verification found zero horizontal overflow.
- Fresh browser logs contain no application errors or warnings.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Shared Subpage Header Logo QA

## **Comparison Target**

- Source visual truth: `/Users/rtm/Desktop/Screenshot 2026-08-10 at 10.28.10 PM.png`, 2076 x 192 pixels at 2x density, identifies the existing centered subpage-logo slot.
- Canonical replacement reference: the homepage header rendered from `/assets/brand/pm-seal-green.svg`.
- Homepage reference capture: `/tmp/publicmarket-subpage-logo-qa/homepage-reference.png` at a 1024 x 768 CSS viewport and 1x density.
- Final desktop subpage capture: `/tmp/publicmarket-subpage-logo-qa/desktop-final.png` at a 1024 x 768 CSS viewport and 1x density.
- Final mobile subpage capture: `/tmp/publicmarket-subpage-logo-qa/mobile-final.png` at a 390 x 780 CSS viewport and 1x density.
- Focused comparison evidence: `/tmp/publicmarket-subpage-logo-qa/homepage-vs-subpage-final.png` and `/tmp/publicmarket-subpage-logo-qa/before-vs-final.png`.

## **Findings And Iteration History**

- Earlier [P2] the shared subpage header displayed Bar Phoebe's scripted `P` raster mark instead of the Public Market identity used by the homepage header.
  - Fix: the shared `HolderPage` header now renders the homepage's exact `/assets/brand/pm-seal-green.svg` asset.
  - Post-fix evidence: the focused comparisons show the Public Market seal centered in the established subpage logo slot, with the same artwork and green fill as the homepage header.
- No actionable P0, P1, or P2 differences remain.

## **Required Fidelity Surfaces**

- Fonts and typography: the replacement is the supplied vector brand artwork, so its embedded lettering remains exact and does not depend on a fallback web font.
- Spacing and layout rhythm: the existing 64 x 64 desktop and mobile subpage header footprint, center alignment, and scroll-compaction behavior remain unchanged.
- Colors and visual tokens: the reused SVG preserves its canonical Public Market green fill (`#355748`).
- Image quality and asset fidelity: the shared header uses the original vector asset directly, with no raster conversion, generated substitute, stretching, cropping, or handcrafted recreation.
- Copy and content: no page copy, menu labels, or subpage content changed.

## **Functional And Responsive Checks**

- `/menu`, `/calendar`, `/private-events`, `/contact`, `/story`, `/reservations`, `/careers`, and `/visit` all render the same canonical seal asset.
- The logo remains a `Return home` link to `/`, and the link's accessible name is unchanged.
- Desktop and mobile verification found zero horizontal overflow.
- Fresh browser logs contain no application errors or warnings.
- React quality review found no new hooks, client-side state, dependency, bundle, accessibility, or rendering concerns from the static asset swap.
- `git diff --check`, `npx tsc --noEmit`, and `npm run build` passed. Next.js emitted the repository's existing non-blocking NFT trace warning from `next.config.ts`.

final result: passed

# PUBLICMARKET Admin Login Concept QA

**Source visual truth**

- `/Users/rtm/Desktop/Screenshot 2026-08-11 at 3.26.58 AM.png`
- Source pixels: 2090 × 1764, including browser chrome.
- Intended state: unauthenticated admin-login concept.

**Rendered implementation**

- Local route: `http://127.0.0.1:4104/admin`
- Desktop capture: `/tmp/public-market-admin-desktop-final-v2.png`
- Mobile capture: `/tmp/public-market-admin-mobile-final-v2.png`
- Full-view comparison: `/tmp/public-market-admin-comparison-final-v2.png`
- Focused form comparison: `/tmp/public-market-admin-focused-comparison-final.png`

**Viewport and normalization**

- Desktop browser-reported CSS viewport: 1280 × 720 at DPR 2. The in-app capture surface returned 1235 × 720 pixels.
- Mobile CSS viewport and capture: 390 × 844 at DPR 1.
- The desktop full-view comparison removes the 160-pixel browser-chrome region from the source, crops both views to the same wide composition, and normalizes each side to 640 × 360.
- The focused comparison aligns the source and implementation login cards at a common 620-pixel width.

**Full-view comparison evidence**

- The implementation preserves the reference composition: full-viewport color field, centered logo, square-cornered light card, one password field, and one full-width CTA.
- The required Public Market branding is intentional: Public Market green replaces red, bone white replaces cream, and the supplied Public Market lockup replaces the Phoebe logo.
- The card remains centered and fully visible at desktop and mobile sizes with no horizontal overflow.

**Focused comparison evidence**

- The focused card comparison confirms consistent hierarchy, label placement, input height, CTA width, square corners, and restrained border treatment.
- Storica intentionally replaces the reference's display type while Roboto Mono remains the compact label type, matching the homepage font system.
- The bone-white Public Market logo is a recolored vector variant of the existing homepage logo asset; it is not a raster or substitute mark.

**Findings and iteration history**

- Iteration 1 — P2: the initial card held an 820-pixel width at a medium desktop viewport, making it materially wider than the reference. Fixed with a responsive desktop width of `clamp(620px, 48vw, 820px)` and a dedicated full-width mobile override.
- Iteration 1 — P2: the shared hover/focus rule turned the CTA black after a touch/click focus state. Fixed by keeping the Public Market green fill for keyboard/touch focus with a visible outline and reserving black for pointer hover.
- Iteration 2: desktop and mobile recaptures show the two earlier P2 issues resolved. No remaining P0, P1, or P2 differences were found.

**Interaction and accessibility checks**

- Password entry accepts local text input.
- The concept CTA remains on `/admin` and does not submit data or call an authentication endpoint.
- The page has zero horizontal overflow at 1280 × 720 and 390 × 844.
- Input and CTA heights are 62 pixels on desktop and 54 pixels on mobile.
- Focus indicators are visible, the logo has descriptive alternative text, and the route emits `noindex, nofollow`.
- Browser console errors checked: 0.

**Final result**

passed
