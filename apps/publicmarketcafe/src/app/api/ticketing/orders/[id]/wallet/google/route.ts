import { venue, disconnectedResponse } from "@/lib/venue";
import { getOrderPassData } from "@/lib/ticketingStore";
import { isGoogleWalletConfigured } from "@/lib/wallet/config";
import { buildGoogleSaveUrl } from "@/lib/wallet/googlePass";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// Order-level "Add to Google Wallet" for the confirmation email: one
// save link covering every ticket. The order UUID is the auth, same
// as the .ics and Apple routes.
export async function GET(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Wallet delivery");

  if (!isGoogleWalletConfigured()) {
    return new Response("Google Wallet isn't set up yet.", { status: 404 });
  }
  const { id } = await context.params;
  const tickets = await getOrderPassData(id);
  if (tickets.length === 0) return new Response("No tickets for this order", { status: 404 });

  try {
    return Response.redirect(await buildGoogleSaveUrl(tickets), 302);
  } catch (error) {
    console.error("[google-wallet] order save failed", error instanceof Error ? error.message : error);
    return new Response("Couldn't create the Google Wallet pass. Please use the QR in your email.", { status: 502 });
  }
}
