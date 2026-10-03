import { venue, disconnectedResponse } from "@/lib/venue";
import { getTicketPassData } from "@/lib/ticketingStore";
import { isGoogleWalletConfigured } from "@/lib/wallet/config";
import { buildGoogleSaveUrl } from "@/lib/wallet/googlePass";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

// The ticket token is the auth, same as /t/:token.
export async function GET(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Wallet delivery");

  if (!isGoogleWalletConfigured()) {
    return new Response("Google Wallet isn't set up yet.", { status: 404 });
  }
  const { token } = await context.params;
  const ticket = await getTicketPassData(token);
  if (!ticket) return new Response("Ticket not found", { status: 404 });

  try {
    return Response.redirect(await buildGoogleSaveUrl([ticket]), 302);
  } catch (error) {
    console.error("[google-wallet] ticket save failed", error instanceof Error ? error.message : error);
    return new Response("Couldn't create the Google Wallet pass. Please use the QR in your email.", { status: 502 });
  }
}
