import { NextResponse, type NextRequest } from "next/server";
import { areaForPath } from "./lib/accessShared";

// Tags every admin request with the area it belongs to, so each page and
// API checks the signed-in person against the right area (see
// hasAdminSession). The headers are always overwritten here, so a client
// can't set them. Paths are read without the venue prefix, matching
// PATH_AREAS.
const VENUE_PREFIX = /^\/(?:willow|madrone|publicmarketcafe)(?=\/|$)/;

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  let pathname = request.nextUrl.pathname;
  pathname = pathname.replace(VENUE_PREFIX, "") || "/";
  const area = areaForPath(pathname);
  headers.set("x-venue-area", area ?? "");
  headers.set("x-venue-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/blackbook/:path*",
    "/:venue(willow|madrone|publicmarketcafe)/admin/:path*",
    "/:venue(willow|madrone|publicmarketcafe)/blackbook/:path*",
    "/:venue(willow|madrone|publicmarketcafe)/upload/:path*",
  ],
};
