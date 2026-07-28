/**
 * Single source of truth for the restaurant's branding and contact info.
 * Edit this file (and the seed data in src/lib/menu-data.ts) to rebrand
 * the site for a different restaurant.
 */
export const siteConfig = {
  name: "DWFPMC",
  tagline: "Wood-fired cooking, neighborhood hospitality",
  description:
    "A neighborhood kitchen serving seasonal, wood-fired dishes made from scratch every day. Join us for lunch, dinner, or a drink at the bar.",
  address: {
    street: "123 Main Street",
    city: "Dallas",
    state: "TX",
    zip: "75201",
  },
  phone: "(214) 555-0123",
  email: "hello@dwfpmc.com",
  hours: [
    { days: "Monday – Thursday", open: "11:00 AM", close: "9:00 PM" },
    { days: "Friday – Saturday", open: "11:00 AM", close: "11:00 PM" },
    { days: "Sunday", open: "10:00 AM", close: "8:00 PM" },
  ],
  social: {
    instagram: "https://instagram.com/dwfpmc",
    facebook: "https://facebook.com/dwfpmc",
  },
} as const;

export type SiteConfig = typeof siteConfig;
