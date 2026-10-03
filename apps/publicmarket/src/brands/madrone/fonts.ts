import localFont from "next/font/local";

const madroneBody = localFont({
  src: "./fonts/TAYBigBird.otf",
  weight: "400",
  display: "swap",
  variable: "--entry-madrone-body",
  fallback: ["Arial"],
  adjustFontFallback: false,
});

export const madroneFonts = madroneBody.variable;
