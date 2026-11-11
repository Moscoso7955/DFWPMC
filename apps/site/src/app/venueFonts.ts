import localFont from "next/font/local";
import { Overpass_Mono } from "next/font/google";

// All three venues' fonts load once; each venue's theme CSS picks its
// own through the --font-venue-* variables.
const willowDisplay = localFont({ src: "./fonts/TAN-WHISTLING.otf", weight: "400", display: "swap", variable: "--font-willow-whistling", fallback: ["Times New Roman"], adjustFontFallback: false });
const willowBody = localFont({ src: "./fonts/Nord-Book.woff2", weight: "400", display: "swap", variable: "--font-willow-nord", fallback: ["Arial"], adjustFontFallback: "Arial" });
const madroneBody = localFont({ src: "./fonts/TAYBigBird.otf", weight: "400", display: "swap", variable: "--font-madrone-big-bird", fallback: ["Arial"], adjustFontFallback: false });
const cafeBody = Overpass_Mono({ weight: "500", subsets: ["latin"], display: "swap", variable: "--font-pmcafe-home" });

export const venueHomeFonts = [willowDisplay.variable, willowBody.variable, madroneBody.variable, cafeBody.variable].join(" ");
