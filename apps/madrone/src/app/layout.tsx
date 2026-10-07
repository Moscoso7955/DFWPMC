import type { Metadata } from "next";
import { venue, venueSiteUrl, venuePath } from "@/lib/venue";
import TrackingScripts from "./components/TrackingScripts";
import "./globals.css";
import "./venue-homepage.css";
import "./venue-ui.css";
import { venueHomeFonts } from "./venueFonts";
const SITE_TITLE = `${venue.name} — ${process.env.VERCEL ? "Website & Admin" : "Local preview"}`;
// Link-preview headline (iMessage, social), in caps on purpose.
const SHARE_TITLE = venue.name;
const SITE_DESCRIPTION = "Local website and admin preview. Venue information is awaiting approved content.";
const SITE_URL = venueSiteUrl();
const OG_IMAGE_URL = `${SITE_URL}${venue.brand.heroImage}`;
export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    openGraph: {
        type: "website",
        url: `${SITE_URL}/`,
        title: SHARE_TITLE,
        description: SITE_DESCRIPTION,
        images: [{ url: OG_IMAGE_URL, alt: venue.name }],
    },
    twitter: {
        card: "summary_large_image",
        title: SHARE_TITLE,
        description: SITE_DESCRIPTION,
        images: [OG_IMAGE_URL],
    },
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" className={venueHomeFonts} data-venue-theme={venue.id}>
      <head>
        <link rel="icon" href={venuePath(venue.logo)} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={venuePath(venue.logo)}/>
      </head>
      <body>
        {children}
        <TrackingScripts />
      </body>
    </html>);
}
