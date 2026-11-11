import { NextResponse, type NextRequest } from "next/server";
import { areaForPath } from "./lib/accessShared";

// Tags every admin request with the area it belongs to, so each page and
// API checks the signed-in person against the right area (see
// hasAdminSession). The headers are always overwritten here, so a client
// can't set them. Paths are read without the venue's basePath, matching
// PATH_AREAS.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const basePath = request.nextUrl.basePath || "";
  let pathname = request.nextUrl.pathname;
  if (basePath && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || "/";
  const area = areaForPath(pathname);
  headers.set("x-venue-area", area ?? "");
  headers.set("x-venue-path", `${pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/blackbook/:path*", "/upload/:path*"],
};
