import localFont from "next/font/local";
const display = localFont({ src: "./fonts/TAN-WHISTLING.otf", weight: "400", display: "swap", variable: "--font-willow-whistling", fallback: ["Times New Roman"], adjustFontFallback: false });
const body = localFont({ src: "./fonts/Nord-Book.woff2", weight: "400", display: "swap", variable: "--font-willow-nord", fallback: ["Arial"], adjustFontFallback: "Arial" });
export const venueHomeFonts = display.variable + " " + body.variable;
