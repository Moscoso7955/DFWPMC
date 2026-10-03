import localFont from "next/font/local";
const body = localFont({ src: "./fonts/TAYBigBird.otf", weight: "400", display: "swap", variable: "--font-madrone-big-bird", fallback: ["Arial"], adjustFontFallback: false });
export const venueHomeFonts = body.variable;
