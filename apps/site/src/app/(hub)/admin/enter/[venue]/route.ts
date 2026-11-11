import { NextRequest, NextResponse } from "next/server";
import { getBrand } from "@/brands";
import { hasAnySession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Selector -> portal. The collective session cookie covers the whole site,
// so entering a venue is a plain redirect; the portal's own pages check
// the signed-in person against their areas.
export async function GET(request: NextRequest, context: { params: Promise<{ venue: string }> }) {
  if (!(await hasAnySession())) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }
  const { venue: venueSlug } = await context.params;
  const brand = getBrand(venueSlug);
  if (!brand) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  return NextResponse.redirect(new URL(brand.admin.portalPath, request.url), 303);
}
