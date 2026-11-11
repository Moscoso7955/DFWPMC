import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { readBlackbookPhoto } from "@/lib/blackbookStore";

// Guest photos are private: only a signed-in Blackbook viewer gets bytes,
// and nothing is cached beyond that person's browser.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasBlackbookSession())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const photo = await readBlackbookPhoto(Number((await params).id));
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
