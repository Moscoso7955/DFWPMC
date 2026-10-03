import { venue } from "@/lib/venue";
import { venuePath } from "@/lib/venue";
import sharp from "sharp";
import { getPublishedEventBySlug } from "@/lib/ticketingStore";
import { getSiteUrl } from "@/lib/stripe";
export const runtime = "nodejs";
type RouteContext = {
    params: Promise<{
        slug: string;
    }>;
};
const WIDTH = 1080;
const HEIGHT = 1350;
const FALLBACK = "/og-event-default.jpg";
// Link-preview image for an event: the uploaded flyer normalized to
// 4:5 (1080×1350), so iMessage and social apps get exactly that shape
// whatever size or format the flyer was uploaded as.
export async function GET(_request: Request, context: RouteContext) {
    const { slug } = await context.params;
    const siteUrl = getSiteUrl();
    const fallback = Response.redirect(`${siteUrl}${FALLBACK}`, 302);
    const event = await getPublishedEventBySlug(slug);
    if (!event?.imageUrl)
        return fallback;
    const source = event.imageUrl.startsWith("/") ? `${siteUrl}${event.imageUrl}` : event.imageUrl;
    if (!/^https?:\/\//.test(source))
        return fallback;
    try {
        const upstream = await fetch(venuePath(source));
        if (!upstream.ok)
            return fallback;
        const jpeg = await sharp(Buffer.from(await upstream.arrayBuffer()))
            .rotate()
            .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
            .flatten({ background: venue.brand.primary })
            .jpeg({ quality: 86, mozjpeg: true })
            .toBuffer();
        return new Response(new Uint8Array(jpeg), {
            headers: {
                "Content-Type": "image/jpeg",
                // The metadata URL carries a ?v= hash of the flyer URL, so a new
                // flyer gets a new URL and these can be cached hard.
                "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
            },
        });
    }
    catch (error) {
        console.error("[event-preview] flyer render failed", error instanceof Error ? error.message : error);
        return fallback;
    }
}
