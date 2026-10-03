# Willow Brand Implementation

Use this file as the implementation source of truth for Willow styling in this local project. The original one-page guide is stored beside it as `Willow_BrandStyleGuide.pdf`.

## Fonts

| Role | Family | Weight | Local asset | CSS token |
| --- | --- | --- | --- | --- |
| Display, logo-adjacent headlines, short statements | TAN Whistling | Regular / 400 | `src/app/fonts/TAN-WHISTLING.otf` | `var(--willow-font-display)` |
| Body copy, navigation, labels, controls | Nord | Book / 400 | `src/app/fonts/Nord-Book.woff2` | `var(--willow-font-body)` |

Both full font files are self-hosted through `next/font/local` in `src/app/layout.tsx`. The loader exposes `--font-willow-whistling` and `--font-willow-nord`; `src/app/globals.css` wraps them in stable Willow role tokens.

Use the role tokens in components:

```css
.willow-heading {
  font-family: var(--willow-font-display);
  font-weight: 400;
}

.willow-copy {
  font-family: var(--willow-font-body);
  font-weight: 400;
}
```

The shared utility classes `.willow-font-display` and `.willow-font-body` provide the same assignments. Keep Whistling for short display copy because its decorative letterforms lose clarity in paragraphs. Use Nord Book for readable interface and editorial text. Avoid synthetic bold or italic styling until matching licensed font files are added.

## Color Palette

### Primary

| Name | Pantone | CMYK | RGB | Hex | CSS token |
| --- | --- | --- | --- | --- | --- |
| Dark Green | 5605 C | 78 58 73 61 | 34 55 43 | `#22372b` | `var(--willow-dark-green)` |
| Pine | 357 C | 85 40 91 38 | 28 86 51 | `#1c5633` | `var(--willow-pine)` |
| Bronze | 7575 C | 38 58 88 26 | 133 93 50 | `#855d32` | `var(--willow-bronze)` |

### Secondary

| Name | Pantone | CMYK | RGB | Hex | CSS token |
| --- | --- | --- | --- | --- | --- |
| Raspberry | 222 C | 45 96 47 35 | 111 28 69 | `#6f1c45` | `var(--willow-raspberry)` |
| Magenta | 2314 C | 34 100 32 7 | 166 0 101 | `#a60065` | `var(--willow-magenta)` |

Keep the hexadecimal values exact in digital work. Use Dark Green, Pine, and Bronze as the core system. Reserve Raspberry and Magenta for selective secondary accents.

## Texture

The supplied green texture is stored at:

`public/assets/willow/green-paper-texture.jpeg`

Use `var(--willow-texture-image)` in custom CSS or apply `.willow-texture`. The utility pairs the texture with Dark Green as its fallback color, centers the image, and covers the element.

## Current Integration State

The Willow fonts, palette, and texture are loaded and ready for component-level use. The existing Phoebe homepage composition and colors remain in place until a Willow section or full rebrand is requested.

This project is local-only on branch `v2-local`. The `origin` push URL is disabled. Confirm that the font licenses cover production web embedding before any future deployment.
