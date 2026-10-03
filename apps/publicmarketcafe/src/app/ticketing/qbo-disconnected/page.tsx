import { venuePath } from "@/lib/venue";
import Link from "next/link";
import TicketingPortalShell from "../TicketingPortalShell";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
// Landing page Intuit sends users to when the connection is broken
// from their side (My Apps → Disconnect). We treat any visit here as
// a signal that the tokens are gone: whoever comes here can either
// reconnect or just head back to the portal home.
export default async function QboDisconnectedPage() {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    return (<TicketingPortalShell role="manager">
      <section className="ticketing-portal-section">
        <div className="ticketing-portal-crumbs">
          <Link href="/ticketing">← Events</Link>
        </div>
        <div className="ticketing-portal-header-row">
          <div>
            <p className="ticketing-portal-kicker">Accounting sync</p>
            <h1>Disconnected</h1>
            <p className="ticketing-portal-sub">
              Public Market Cafe & Goods Ticketing is no longer connected to your QuickBooks Online company. Journal-entry sync
              is paused until you reconnect.
            </p>
          </div>
        </div>

        <div className="qbo-card">
          <p className="qbo-card-body">
            You disconnected the app from within QuickBooks Online. Nothing else has changed in Public Market Cafe & Goods
            Ticketing — events, tiers, orders and tickets are untouched. When you&apos;re ready, reconnect
            below.
          </p>
          <div className="ticketing-portal-actions">
            <Link href="/ticketing/qbo-connect" className="ticketing-portal-primary">
              Reconnect
            </Link>
            <Link href="/ticketing" className="ticketing-portal-secondary">
              Back to events
            </Link>
          </div>
        </div>
      </section>
    </TicketingPortalShell>);
}
