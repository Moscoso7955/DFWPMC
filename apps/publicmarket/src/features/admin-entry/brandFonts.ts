import type { BrandSlug } from "@/brands";
import { willowFonts } from "@/brands/willow/fonts";
import { madroneFonts } from "@/brands/madrone/fonts";
import { pmcafeFonts } from "@/brands/pmcafe/fonts";

export const brandFonts = {
  willow: willowFonts,
  madrone: madroneFonts,
  pmcafe: pmcafeFonts,
} satisfies Record<BrandSlug, string>;
