import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrackingScripts from "../../components/TrackingScripts";
import { VenueProvider } from "../../components/VenueProvider";
import { VENUE_SLUGS, findVenue, siteOrigin, venuePathFor } from "@/lib/venues";
import "../../globals.css";
import "../../venue-ui.css";
import "../../venue-homepage-willow.css";
import "../../venue-homepage-madrone.css";
import "../../venue-homepage-publicmarketcafe.css";
import { venueHomeFonts } from "../../venueFonts";

type VenueLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ venue: string }>;
};

export function generateStaticParams() {
  return VENUE_SLUGS.map((venue) => ({ venue }));
}

const SITE_DESCRIPTION = "Local website and admin preview. Venue information is awaiting approved content.";

export async function generateMetadata({ params }: { params: Promise<{ venue: string }> }): Promise<Metadata> {
  const venue = findVenue((await params).venue);
  if (!venue) return {};
  const siteUrl = `${siteOrigin()}${venue.basePath}`;
  const ogImage = `${siteOrigin()}${venue.brand.heroImage}`;
  return {
    metadataBase: new URL(siteOrigin()),
    title: `${venue.name} — ${process.env.VERCEL ? "Website & Admin" : "Local preview"}`,
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      url: `${siteUrl}/`,
      title: venue.name,
      description: SITE_DESCRIPTION,
      images: [{ url: ogImage, alt: venue.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: venue.name,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export default async function VenueLayout({ children, params }: VenueLayoutProps) {
  const venue = findVenue((await params).venue);
  if (!venue) notFound();
  return (
    <html lang="en" className={venueHomeFonts} data-venue-theme={venue.slug}>
      <head>
        <link rel="icon" href={venuePathFor(venue, venue.logo)} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={venuePathFor(venue, venue.logo)} />
      </head>
      <body>
        <VenueProvider venue={venue}>
          <TrackingScripts />
          {children}
        </VenueProvider>
      </body>
    </html>
  );
}
