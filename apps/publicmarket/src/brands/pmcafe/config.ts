import type { BrandConfig } from "../types";

export const pmcafeBrand = {
  slug: "pmcafe",
  name: "PM cafe",
  publicName: "PM Cafe",
  sitePath: "/publicmarketcafe",
  logo: "/assets/venues/pmcafe-logo.svg",
  background: "/assets/venues/pmcafe-hero.png",
  admin: {
    loginPath: "/admin/login/pmcafe",
    portalPath: "/publicmarketcafe/admin",
    portalStatus: "planned",
  },
} as const satisfies BrandConfig;
