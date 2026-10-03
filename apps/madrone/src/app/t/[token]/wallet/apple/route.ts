import { venue, disconnectedResponse } from "@/lib/venue";
import { getTicketPassData } from "@/lib/ticketingStore";
import { buildApplePass } from "@/lib/wallet/applePass";
import { isAppleWalletConfigured } from "@/lib/wallet/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

// The ticket token is the auth, same as /t/:token and its QR image.
export async function GET(_request: Request, context: RouteContext) {
  if (venue.localPreview) return disconnectedResponse("Wallet delivery");

  if (!isAppleWalletConfigured()) {
    return new Response("Apple Wallet isn't set up yet.", { status: 404 });
  }

  const { token } = await context.params;
  const ticket = await getTicketPassData(token);
  if (!ticket) return new Response("Ticket not found", { status: 404 });

  let pkpass: Buffer;
  try {
    pkpass = buildApplePass(ticket);
  } catch (error) {
    console.error("[apple-wallet] pass build failed", error instanceof Error ? error.message : error);
    return new Response("Couldn't create the Wallet pass. Please use the QR in your email.", {
      status: 500,
    });
  }

  return new Response(new Uint8Array(pkpass), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="bar-phoebe-${ticket.eventSlug}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}
