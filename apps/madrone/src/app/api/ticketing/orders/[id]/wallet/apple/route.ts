import { venue, disconnectedResponse } from "@/lib/venue";
import { getOrderPassData } from "@/lib/ticketingStore";
import { buildAppleOrderPasses } from "@/lib/wallet/applePass";
import { isAppleWalletConfigured } from "@/lib/wallet/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// Order-level "Add to Apple Wallet" for the top of the confirmation
// email. The order UUID is the auth, same as the .ics route.
export async function GET(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Wallet delivery");

  if (!isAppleWalletConfigured()) {
    return new Response("Apple Wallet isn't set up yet.", { status: 404 });
  }

  const { id } = await context.params;
  const tickets = await getOrderPassData(id);
  if (tickets.length === 0) return new Response("No tickets for this order", { status: 404 });

  try {
    const { body, contentType, extension } = buildAppleOrderPasses(tickets);
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="bar-phoebe-${tickets[0].eventSlug}.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[apple-wallet] order pass build failed", error instanceof Error ? error.message : error);
    return new Response("Couldn't create the Wallet pass. Please use the QR in your email.", { status: 500 });
  }
}
