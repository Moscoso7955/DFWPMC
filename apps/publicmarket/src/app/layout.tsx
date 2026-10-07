import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import TrackingScripts from "./components/TrackingScripts";
import "./globals.css";

const robotoMono = Roboto_Mono({ weight: "300", subsets: ["latin"], variable: "--font-mono" });

const SITE_TITLE = "The Public Market — Fort Worth, Texas";
const SITE_DESCRIPTION =
  "A historic landmark reimagined as a cultural and culinary hub in the heart of Fort Worth.";
const SITE_URL = "https://fwpublicmarket.com";
const OG_IMAGE_URL = `${SITE_URL}/og-image.png?v=20260811`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    siteName: "The Public Market",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "The historic Public Market in Fort Worth, Texas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={robotoMono.variable}>
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="48x48" />
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="icon" href="/serp-favicon.png?v=3" sizes="96x96" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
      </head>
      <body>
        {children}
        <Analytics />
        <TrackingScripts />
      </body>
    </html>
  );
}
