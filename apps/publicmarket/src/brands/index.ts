import { willowBrand } from "./willow/config";
import { madroneBrand } from "./madrone/config";
import { pmcafeBrand } from "./pmcafe/config";

export type { BrandConfig, BrandSlug } from "./types";

// Preserve the approved selector and public venue order.
export const brands = [willowBrand, madroneBrand, pmcafeBrand] as const;

export function getBrand(slug: string) {
  return brands.find((brand) => brand.slug === slug);
}
