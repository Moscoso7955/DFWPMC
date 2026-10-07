import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import { saveCMSMedia } from "@/lib/collective/cms";

export const runtime = "nodejs";

// Matches the venue apps' upload rules (src/lib/adminFiles.ts) so files land
// in the same store layout and are served by the venue /api/cms-media route.
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await hasCollectiveSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const venueSlug = form.get("venue");
  const venue = typeof venueSlug === "string" ? getCollectiveVenue(venueSlug) : undefined;
  if (!venue) {
    return NextResponse.json({ error: "Unknown venue." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });
  }

  const originalName = file.name || "upload";
  const extension = originalName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json(
      { error: "Use a .jpg, .jpeg, .png, .webp, or .svg file." },
      { status: 400 },
    );
  }

  const slug =
    originalName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  const filename = `${Date.now()}-${randomUUID()}-${slug}.${extension}`;

  try {
    await saveCMSMedia(venue, filename, file, contentType);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The image could not be uploaded.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ src: `${venue.basePath}/api/cms-media/${filename}` });
}
