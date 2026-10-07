import { NextRequest, NextResponse } from "next/server";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import { publishDraft } from "@/lib/collective/content";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await hasCollectiveSession())) {
    return NextResponse.redirect(new URL("/admin/login?error=expired", request.url), 303);
  }

  let venueSlug = "";
  try {
    const form = await request.formData();
    venueSlug = String(form.get("venue") ?? "");
  } catch {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  const venue = getCollectiveVenue(venueSlug);
  if (!venue) return NextResponse.redirect(new URL("/admin", request.url), 303);

  try {
    await publishDraft(venue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "publish failed";
    const url = new URL(`/admin/${venue.slug}`, request.url);
    url.searchParams.set("error", message.slice(0, 200));
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(
    new URL(`/admin/${venue.slug}?notice=published`, request.url),
    303,
  );
}
