import localFont from "next/font/local";

const willowDisplay = localFont({
  src: "./fonts/TAN-WHISTLING.otf",
  weight: "400",
  display: "swap",
  variable: "--entry-willow-display",
  fallback: ["Times New Roman"],
  adjustFontFallback: false,
});

const willowBody = localFont({
  src: "./fonts/Nord-Book.woff2",
  weight: "400",
  display: "swap",
  variable: "--entry-willow-body",
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const willowFonts = `${willowDisplay.variable} ${willowBody.variable}`;
