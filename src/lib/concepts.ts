/**
 * The Fort Worth Public Market Collective — one building, three concepts.
 * This registry drives the landing page hotspots and each concept sub-site.
 * Content here is placeholder copy until the admin/Supabase layer lands.
 */

export interface MenuSectionData {
  title: string;
  items: { name: string; description: string; price?: string }[];
}

export interface Concept {
  slug: string;
  name: string;
  kicker: string;
  tagline: string;
  description: string;
  /** Where the concept physically sits in the building (per ID-102 plan). */
  location: string;
  /** Landing-page hotspot: which slice of the facade image, viewed from the east (tower on the right). */
  zone: "left" | "center" | "right";
  hours: { days: string; time: string }[];
  /** Tock reservation URL; null = reservations not open yet. */
  tockUrl: string | null;
  reserveNote: string;
  menu: MenuSectionData[];
  theme: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    displayClass: string;
  };
}

export const collective = {
  name: "Fort Worth Public Market",
  shortName: "FW Public Market",
  suffix: "Collective",
  tagline: "One landmark. Three ways to gather.",
  description:
    "The historic 1930 Public Market building, brought back to life as a collective of three concepts — a daytime market cafe, a fine dining room, and a bar worth dressing up for.",
  address: {
    street: "1400 Henderson Street",
    city: "Fort Worth",
    state: "TX",
    zip: "76102",
  },
  instagram: "https://instagram.com",
  eventsEmbedUrl: "https://tipsyapp.io/embed/fort-worth-public-market-collective",
} as const;

export const concepts: Concept[] = [
  {
    slug: "cafe",
    name: "Public Market Cafe",
    kicker: "Day Market & Brunch",
    tagline: "Mornings in the market hall",
    description:
      "Espresso, a bakery case stocked at dawn, and a brunch menu that runs all day. The north hall keeps the building's market spirit — come in, linger, take something home.",
    location: "North hall, at the tower entrance",
    zone: "right",
    hours: [
      { days: "Every day", time: "7:00 AM – 3:00 PM" },
    ],
    tockUrl: null,
    reserveNote: "Walk-ins welcome — no reservation needed.",
    menu: [
      {
        title: "From the bakery",
        items: [
          { name: "Morning pastries", description: "Baked in-house daily — croissants, kolaches, seasonal danishes." },
          { name: "Market loaf", description: "Naturally leavened sourdough, whole or by the slice." },
        ],
      },
      {
        title: "Brunch, all day",
        items: [
          { name: "Market plate", description: "Soft eggs, seasonal vegetables, grilled sourdough." },
          { name: "Griddle cakes", description: "Whipped butter, Texas honey." },
          { name: "Breakfast tacos", description: "Flour tortillas, salsa roja, from the west kitchen." },
        ],
      },
    ],
    theme: {
      bg: "#faf5ec",
      surface: "#ffffff",
      ink: "#2e2620",
      muted: "#7c7266",
      accent: "#b9741f",
      displayClass: "display-cafe",
    },
  },
  {
    slug: "madrone",
    name: "Madrone",
    kicker: "Fine Dining",
    tagline: "Dinner in the heart of the hall",
    description:
      "A fine dining room in the center of the market hall, entered from the historical corridor. Seasonal tasting and à la carte menus — and a private dining room behind a hidden door.",
    location: "Center hall — entrance off the historical corridor",
    zone: "center",
    hours: [
      { days: "Tuesday – Saturday", time: "5:00 PM – 10:00 PM" },
    ],
    tockUrl: null,
    reserveNote: "Reservations via Tock — opening soon.",
    menu: [
      {
        title: "To begin",
        items: [
          { name: "Gulf crudo", description: "Citrus, chili oil, herbs from the market." },
          { name: "Roasted bone marrow", description: "Charred sourdough, preserved lemon gremolata." },
        ],
      },
      {
        title: "Mains",
        items: [
          { name: "Dry-aged Texas ribeye", description: "For two, carved tableside." },
          { name: "Half chicken al mattone", description: "Wood-fired, salsa verde." },
        ],
      },
      {
        title: "Private dining",
        items: [
          { name: "The hidden room", description: "A chef's menu behind the hidden door — inquire for buyouts and celebrations." },
        ],
      },
    ],
    theme: {
      bg: "#1d1512",
      surface: "#2a1f1a",
      ink: "#f3ece2",
      muted: "#a8988a",
      accent: "#c9a227",
      displayClass: "display-madrone",
    },
  },
  {
    slug: "willow",
    name: "Willow",
    kicker: "Bar",
    tagline: "A bar worth dressing up for",
    description:
      "The south end of the building, poured slow: classic cocktails, a deep back bar, and a VIP room for nights that deserve one.",
    location: "South hall — Willow Bar, foyer & VIP room",
    zone: "left",
    hours: [
      { days: "Wednesday – Sunday", time: "4:00 PM – Late" },
    ],
    tockUrl: null,
    reserveNote: "Bar seating first-come; VIP room reservations via Tock — opening soon.",
    menu: [
      {
        title: "Cocktails",
        items: [
          { name: "Willow old fashioned", description: "Bourbon, pecan, smoked demerara." },
          { name: "Garden spritz", description: "Herbs, citrus, cava." },
          { name: "The 1930", description: "A nod to the building's first year — gin, chartreuse, lime." },
        ],
      },
      {
        title: "The VIP room",
        items: [
          { name: "Reserved nights", description: "A private corner of the south hall with its own service. Inquire for availability." },
        ],
      },
    ],
    theme: {
      bg: "#131711",
      surface: "#1e241b",
      ink: "#eef0e6",
      muted: "#98a08c",
      accent: "#b08d57",
      displayClass: "display-willow",
    },
  },
];

export function getConcept(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}
