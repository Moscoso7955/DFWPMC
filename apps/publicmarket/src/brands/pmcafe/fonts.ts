import localFont from "next/font/local";

const pmcafeBody = localFont({
  src: "./fonts/Overpass-Mono-Medium.woff2",
  weight: "500",
  display: "swap",
  variable: "--entry-pmcafe-body",
  fallback: ["Courier New"],
  adjustFontFallback: false,
});

export const pmcafeFonts = pmcafeBody.variable;
