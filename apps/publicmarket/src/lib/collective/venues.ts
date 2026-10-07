import "server-only";

export type CollectiveVenue = {
  /** URL slug used in the unified admin (/admin/[venue]) */
  slug: string;
  /** Venue id — must match venue.config.json `id` (cookie prefix + blob namespace) */
  id: string;
  name: string;
  /** Public base path on fwpublicmarket.com */
  basePath: string;
  /** Hub env var holding that venue's CMS_STORAGE_READ_WRITE_TOKEN */
  tokenEnv: string;
  logo: string;
};

export const COLLECTIVE_VENUES: CollectiveVenue[] = [
  {
    slug: "willow",
    id: "willow",
    name: "Willow",
    basePath: "/willow",
    tokenEnv: "CMS_WILLOW_TOKEN",
    logo: "/assets/venues/willow-logo.svg",
  },
  {
    slug: "madrone",
    id: "madrone",
    name: "Madrone",
    basePath: "/madrone",
    tokenEnv: "CMS_MADRONE_TOKEN",
    logo: "/assets/venues/madrone-logo.svg",
  },
  {
    slug: "pmcafe",
    id: "publicmarketcafe",
    name: "Public Market Cafe",
    basePath: "/publicmarketcafe",
    tokenEnv: "CMS_PMCAFE_TOKEN",
    logo: "/assets/venues/pmcafe-logo.svg",
  },
];

export function getCollectiveVenue(slug: string): CollectiveVenue | undefined {
  return COLLECTIVE_VENUES.find((v) => v.slug === slug);
}

export function venueCMSToken(venue: CollectiveVenue): string {
  const value = process.env[venue.tokenEnv];
  if (!value) {
    throw new Error(`CMS storage for ${venue.name} is not configured (missing ${venue.tokenEnv}).`);
  }
  return value;
}

/** Resolve a stored asset value to a URL the hub can display. */
export function displayAssetUrl(venue: CollectiveVenue, value: string): string {
  if (!value) return value;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith(`${venue.basePath}/`)) return value;
  if (value.startsWith("/")) return `${venue.basePath}${value}`;
  return value;
}
