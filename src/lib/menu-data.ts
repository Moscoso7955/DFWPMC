import type { MenuCategory } from "./types";

/**
 * Local seed menu, used when Supabase isn't configured yet.
 * Mirrors the seed rows in supabase/migrations/0001_init.sql.
 */
export const seedMenu: MenuCategory[] = [
  {
    id: "starters",
    name: "Starters",
    description: "Small plates to share while you settle in.",
    sort_order: 1,
    items: [
      {
        id: "burrata",
        name: "Burrata & Charred Tomatoes",
        description:
          "Creamy burrata, blistered cherry tomatoes, basil oil, grilled sourdough.",
        price: 14,
        category_id: "starters",
        is_featured: true,
        is_available: true,
        dietary_tags: ["vegetarian"],
      },
      {
        id: "crispy-brussels",
        name: "Crispy Brussels Sprouts",
        description: "Flash-fried, tossed with chili honey and toasted pecans.",
        price: 11,
        category_id: "starters",
        is_featured: false,
        is_available: true,
        dietary_tags: ["vegetarian", "gluten-free"],
      },
      {
        id: "smoked-wings",
        name: "Oak-Smoked Wings",
        description:
          "Dry-rubbed and smoked over oak, finished on the grill. Ranch or hot honey.",
        price: 13,
        category_id: "starters",
        is_featured: false,
        is_available: true,
        dietary_tags: ["gluten-free"],
      },
    ],
  },
  {
    id: "mains",
    name: "Mains",
    description: "From the wood-fired oven and grill.",
    sort_order: 2,
    items: [
      {
        id: "margherita",
        name: "Margherita Pizza",
        description:
          "San Marzano tomato, fresh mozzarella, basil, extra-virgin olive oil.",
        price: 16,
        category_id: "mains",
        is_featured: true,
        is_available: true,
        dietary_tags: ["vegetarian"],
      },
      {
        id: "short-rib",
        name: "Braised Short Rib",
        description:
          "Red-wine braised beef short rib, creamy polenta, gremolata.",
        price: 28,
        category_id: "mains",
        is_featured: true,
        is_available: true,
        dietary_tags: ["gluten-free"],
      },
      {
        id: "grilled-salmon",
        name: "Cedar-Grilled Salmon",
        description:
          "Atlantic salmon on a cedar plank, charred lemon, seasonal vegetables.",
        price: 26,
        category_id: "mains",
        is_featured: false,
        is_available: true,
        dietary_tags: ["gluten-free"],
      },
      {
        id: "mushroom-rigatoni",
        name: "Wild Mushroom Rigatoni",
        description:
          "House rigatoni, roasted wild mushrooms, garlic cream, pecorino.",
        price: 21,
        category_id: "mains",
        is_featured: false,
        is_available: true,
        dietary_tags: ["vegetarian"],
      },
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    description: "Made in-house every morning.",
    sort_order: 3,
    items: [
      {
        id: "butter-cake",
        name: "Warm Butter Cake",
        description: "Vanilla bean ice cream, salted caramel, candied pecans.",
        price: 10,
        category_id: "desserts",
        is_featured: false,
        is_available: true,
        dietary_tags: ["vegetarian"],
      },
      {
        id: "affogato",
        name: "Affogato",
        description: "Double espresso poured over house-made gelato.",
        price: 8,
        category_id: "desserts",
        is_featured: false,
        is_available: true,
        dietary_tags: ["vegetarian", "gluten-free"],
      },
    ],
  },
  {
    id: "drinks",
    name: "Drinks",
    description: "Cocktails, local drafts, and a focused wine list.",
    sort_order: 4,
    items: [
      {
        id: "old-fashioned",
        name: "Smoked Old Fashioned",
        description: "Bourbon, demerara, bitters, smoked tableside.",
        price: 14,
        category_id: "drinks",
        is_featured: false,
        is_available: true,
        dietary_tags: [],
      },
      {
        id: "house-red",
        name: "House Red / White",
        description: "Rotating selection from small producers. Ask your server.",
        price: 11,
        category_id: "drinks",
        is_featured: false,
        is_available: true,
        dietary_tags: [],
      },
    ],
  },
];
