import type { BrandConfig } from "../types";

export const madroneBrand = {
  slug: "madrone",
  name: "Madrone",
  publicName: "Madrone",
  sitePath: "/madrone",
  logo: "/assets/venues/madrone-logo.svg",
  background: "/assets/venues/madrone-hero.png",
  admin: {
    loginPath: "/admin/login/madrone",
    portalPath: "/madrone/admin",
    portalStatus: "planned",
  },
} as const satisfies BrandConfig;
