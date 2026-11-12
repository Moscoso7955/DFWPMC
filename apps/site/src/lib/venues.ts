// The three venues this one app serves. Each is a skin: same code,
// its own brand, content store and records. The slug is the URL
// segment (/willow/...), unchanged from the old per-venue deployments
// so every public URL and stored content path keeps working.

export type VenueBrand = {
  primary: string;
  accent: string;
  paper: string;
  ink: string;
  heroImage: string;
  bodyFont: string;
  headingFont: string;
};

export type VenueConfig = {
  id: string;
  slug: string;
  name: string;
  basePath: string;
  logo: string;
  fixturePrefix: string;
  localPreview: boolean;
  /** The env prefix for this venue's own stores (blob token etc.). */
  envPrefix: string;
  brand: VenueBrand;
};

// Provider integrations stay paused until the collective flips this off.
export const LOCAL_PREVIEW = process.env.NEXT_PUBLIC_LOCAL_PREVIEW !== "false";

const defineVenue = (venue: Omit<VenueConfig, "basePath" | "localPreview">): VenueConfig => ({
  ...venue,
  basePath: `/${venue.slug}`,
  localPreview: LOCAL_PREVIEW,
});

export const VENUES: VenueConfig[] = [
  defineVenue({
    id: "willow",
    slug: "willow",
    name: "Willow",
    logo: "/willow/assets/brand/venue-logo.svg",
    fixturePrefix: "22222222",
    envPrefix: "WILLOW",
    brand: {
      primary: "#22372b",
      accent: "#855d32",
      paper: "#f3f0e6",
      ink: "#243329",
      heroImage: "/willow/assets/willow/willow-hero-lounge-full.png",
      bodyFont: "Nord Book",
      headingFont: "TAN Whistling",
    },
  }),
  defineVenue({
    id: "madrone",
    slug: "madrone",
    name: "Madrone",
    logo: "/madrone/assets/brand/venue-logo.svg",
    fixturePrefix: "11111111",
    envPrefix: "MADRONE",
    brand: {
      primary: "#79242e",
      accent: "#debbb0",
      paper: "#f5eee9",
      ink: "#542d33",
      heroImage: "/madrone/assets/madrone/madrone-hero-tree-room.png",
      bodyFont: "TAY Big Bird",
      headingFont: "TAY Big Bird",
    },
  }),
  defineVenue({
    id: "publicmarketcafe",
    slug: "publicmarketcafe",
    name: "Public Market Cafe & Goods",
    logo: "/publicmarketcafe/assets/brand/venue-logo.svg",
    fixturePrefix: "33333333",
    envPrefix: "PMCAFE",
    brand: {
      primary: "#0d0d0d",
      accent: "#cda787",
      paper: "#f4f0e9",
      ink: "#28231f",
      heroImage: "/publicmarketcafe/assets/pmcafe/public-market-cafe-hero.png",
      bodyFont: "Overpass Mono",
      headingFont: "Overpass Mono",
    },
  }),
];

export const VENUE_SLUGS = VENUES.map((v) => v.slug);

export function isVenueSlug(value: unknown): value is string {
  return typeof value === "string" && VENUE_SLUGS.includes(value);
}

export function getVenue(slug: string): VenueConfig {
  const found = VENUES.find((v) => v.slug === slug || v.id === slug);
  if (!found) throw new Error(`Unknown venue: ${slug}`);
  return found;
}

export function findVenue(slug: unknown): VenueConfig | null {
  return typeof slug === "string" ? (VENUES.find((v) => v.slug === slug || v.id === slug) ?? null) : null;
}

/**
 * The public URL for a venue-relative path — the venue's slug prefix
 * plus the path, matching the URLs the old per-venue deployments
 * served. Absolute URLs and already-prefixed paths pass through.
 */
export function venuePathFor<T>(venue: VenueConfig, value: T): T {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return value;
  if (value === venue.basePath || value.startsWith(`${venue.basePath}/`) || value.startsWith(`${venue.basePath}?`)) return value;
  return `${venue.basePath}${value}` as T;
}

export function venueSrcSetFor(venue: VenueConfig, value: string | undefined): string | undefined {
  return value
    ?.split(",")
    .map((part) => {
      const [url, ...descriptor] = part.trim().split(/\s+/);
      return [venuePathFor(venue, url), ...descriptor].join(" ");
    })
    .join(", ");
}

/** This site's own origin (one origin now serves every venue). */
export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3110").replace(/\/+$/, "");
}

export function siteRequestUrl(request: Request) {
  return process.env.VERCEL ? siteOrigin() : request.url;
}

export const PREVIEW_MESSAGE = "Preview data. This service is not connected yet. No records were changed.";

export function disconnectedResponse(service: string) {
  return Response.json({ error: `${service}: ${PREVIEW_MESSAGE}`, code: "INTEGRATION_NOT_CONFIGURED" }, { status: 503 });
}

// The collective itself, for features that belong to the whole Public
// Market rather than one venue (Playbook, Contacts, digest emails).
export const COLLECTIVE = {
  name: "The Public Market",
  timeZone: "America/Chicago",
  get siteUrl() {
    return siteOrigin();
  },
};
