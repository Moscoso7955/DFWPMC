import "server-only";
import type { BrandConfig, BrandSlug } from "@/brands";

const localOriginVariables: Record<BrandSlug, string> = {
  madrone: "LOCAL_ADMIN_MADRONE_ORIGIN",
  willow: "LOCAL_ADMIN_WILLOW_ORIGIN",
  pmcafe: "LOCAL_ADMIN_PMCAFE_ORIGIN",
};

export function isLocalAdminPreview(): boolean {
  return Object.values(localOriginVariables).some(name => Boolean(process.env[name]));
}

// Local previews can opt into loopback origins. Hosted forms post to the venue through the shared domain.
export function getLocalAdminLoginAction(brand: BrandConfig): string | undefined {
  const value = process.env[localOriginVariables[brand.slug]];
  if (!value) return `${brand.admin.portalPath}/api/login`;

  const origin = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
    throw new Error(`${localOriginVariables[brand.slug]} must use a local origin.`);
  }

  return new URL(`${brand.admin.portalPath}/api/login`, origin.origin).href;
}
