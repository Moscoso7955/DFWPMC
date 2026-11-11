import { readCMSMedia } from "@/lib/cmsStorage";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ venue: string; filename: string }> }) {
  const { venue: venueSlug, filename } = await params;
  const venue = getVenue(venueSlug);
  const blob = await readCMSMedia(venue, filename);
  if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404 });
  // This route serves only the venue's uploaded website images, never private CMS records.
  return new Response(blob.stream, { headers: {
    "Content-Type": blob.blob.contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
  } });
}
