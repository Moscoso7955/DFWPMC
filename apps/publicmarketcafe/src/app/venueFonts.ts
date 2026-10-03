import { Overpass_Mono } from "next/font/google";
const body = Overpass_Mono({ weight: "500", subsets: ["latin"], display: "swap", variable: "--font-pmcafe-home" });
export const venueHomeFonts = body.variable;
