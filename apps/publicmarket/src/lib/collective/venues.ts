import "server-only";

export type CollectiveVenue = {
  /** Brand slug used in hub routes (/admin/enter/[venue], /admin/login/[brand]) */
  slug: string;
  /** Venue id — must match venue.config.json `id` (cookie prefix) */
  id: string;
  name: string;
  /** Public base path on fwpublicmarket.com */
  basePath: string;
  /** Hub env var holding that venue's ADMIN_SESSION_SECRET */
  sessionSecretEnv: string;
  /** Hub env var holding that venue's CMS_STORAGE_READ_WRITE_TOKEN */
  tokenEnv: string;
};

export const COLLECTIVE_VENUES: CollectiveVenue[] = [
  {
    slug: "willow",
    id: "willow",
    name: "Willow",
    basePath: "/willow",
    sessionSecretEnv: "WILLOW_ADMIN_SESSION_SECRET",
    tokenEnv: "CMS_WILLOW_TOKEN",
  },
  {
    slug: "madrone",
    id: "madrone",
    name: "Madrone",
    basePath: "/madrone",
    sessionSecretEnv: "MADRONE_ADMIN_SESSION_SECRET",
    tokenEnv: "CMS_MADRONE_TOKEN",
  },
  {
    slug: "pmcafe",
    id: "publicmarketcafe",
    name: "Public Market Cafe",
    basePath: "/publicmarketcafe",
    sessionSecretEnv: "PMCAFE_ADMIN_SESSION_SECRET",
    tokenEnv: "CMS_PMCAFE_TOKEN",
  },
];

export function getCollectiveVenue(slug: string): CollectiveVenue | undefined {
  return COLLECTIVE_VENUES.find((v) => v.slug === slug);
}
