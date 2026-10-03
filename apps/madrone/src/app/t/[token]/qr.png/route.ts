import { generateTicketQrPng } from "@/lib/qrCode";
import { getSiteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

// Serves the QR image for a single ticket at a stable public URL.
// The ticket token itself is the auth: it's a random-generated
// identifier that a buyer already receives in the confirmation
// email, so we don't gate on a session cookie (email images render
// without any).
//
// Referenced by the confirmation email's <img src=...> so email
// clients that strip data: URIs (Gmail, Outlook) still show the QR
// inline instead of a black rectangle.
export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 8) {
    return new Response("Bad Request", { status: 400 });
  }

  const siteUrl = getSiteUrl();
  const png = await generateTicketQrPng(`${siteUrl}/t/${token}`);

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
