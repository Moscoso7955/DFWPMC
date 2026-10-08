import config from "../../venue.config.json";

export type VenueConfig = {
  id: string; name: string; basePath: string; port: number;
  logo: string; fixturePrefix: string; localPreview: boolean;
  entryOrigin: string; entryLoginPath: string;
  brand: { primary: string; accent: string; paper: string; ink: string; heroImage: string; bodyFont: string; headingFont: string };
};
export const venue: VenueConfig = config;

// Next Link, router and next/navigation redirect add basePath themselves.
// Native URLs, route-handler redirect URLs, fetch and images use this helper.
export function venuePath<T>(value: T): T {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return value;
  if (value === venue.basePath || value.startsWith(`${venue.basePath}/`) || value.startsWith(`${venue.basePath}?`)) return value;
  return `${venue.basePath}${value}` as T;
}
export function venueSrcSet(value: string | undefined): string | undefined {
  return value?.split(",").map(part => { const [url, ...descriptor] = part.trim().split(/\s+/); return [venuePath(url), ...descriptor].join(" "); }).join(", ");
}
export function appPath(value: string): string {
  return value === venue.basePath ? "/" : value.startsWith(`${venue.basePath}/`) ? value.slice(venue.basePath.length) : value;
}
export function venueSiteUrl() { return process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${venue.port}${venue.basePath}`; }
export function venueRequestUrl(request: Request) { return process.env.VERCEL ? venueSiteUrl() : request.url; }
export function collectiveLogoutUrl() {
  return new URL("/admin/logout", venue.entryOrigin).href;
}
export function adminEntryUrl(error?: string) {
  const url = new URL(venue.entryLoginPath, venue.entryOrigin);
  if (error) url.searchParams.set("error", error);
  return url.href;
}
export const PREVIEW_MESSAGE = "Preview data. This service is not connected yet. No records were changed.";
export function disconnectedResponse(service: string) {
  return Response.json({ error: `${service}: ${PREVIEW_MESSAGE}`, code: "INTEGRATION_NOT_CONFIGURED" }, { status: 503 });
}
