import type { BrandConfig } from "../types";

export const willowBrand = {
  slug: "willow",
  name: "Willow",
  publicName: "Willow",
  sitePath: "/willow",
  logo: "/assets/venues/willow-logo.svg",
  background: "/assets/venues/willow-hero.png",
  admin: {
    loginPath: "/admin/login/willow",
    portalPath: "/willow/admin",
    portalStatus: "planned",
  },
} as const satisfies BrandConfig;
