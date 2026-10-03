import { venue, venuePath } from "@/lib/venue";
import Link from "next/link";
import TicketingPortalShell from "../TicketingPortalShell";
import { getQboEnvironment } from "@/lib/qboOAuth";
import { getQboConnection } from "@/lib/qboConnectionStore";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
type PageProps = {
    searchParams?: Promise<{
        status?: string;
        error?: string;
        realm?: string;
    }>;
};
function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
    });
}
export default async function QboConnectPage({ searchParams }: PageProps) {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const environment = getQboEnvironment();
    const connection = await getQboConnection(environment);
    const params = searchParams ? await searchParams : {};
    const status = params.status;
    const error = params.error;
    // Real safety check: QBO on production while Stripe is on test
    // keys would let a test-mode ticket sale get posted as a real
    // journal entry once the Phase 9 JE cron ships. Detect the
    // mismatch and warn on the connect page.
    // Accept sk_live_, rk_live_ (restricted keys), or any other
    // Stripe live-mode prefix by matching "_live_" anywhere in the
    // first ~10 characters. sk_test_ / rk_test_ / pk_test_ all
    // contain "_test_" so they're guaranteed to miss.
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    const stripeIsLive = stripeKey.length > 0 && !stripeKey.slice(0, 12).includes("_test_");
    const modeMismatch = !venue.localPreview && environment === "production" && !stripeIsLive;
    return (<TicketingPortalShell role="manager">
      <section className="ticketing-portal-section">
        <div className="ticketing-portal-crumbs">
          <Link href="/ticketing">← Events</Link>
        </div>
        <div className="ticketing-portal-header-row">
          <div>
            <p className="ticketing-portal-kicker">Accounting sync</p>
            <h1>QuickBooks Online</h1>
            <p className="ticketing-portal-sub">
              Connect the venue QuickBooks Online account after the client configures accounting. Environment: <strong>{venue.localPreview ? "Local preview" : environment}</strong>.
            </p>
          </div>
        </div>

        {status === "connected" ? (<div className="qbo-alert qbo-alert--good" role="status">
            QuickBooks Online is connected.
          </div>) : null}
        {status === "disconnected" ? (<div className="qbo-alert qbo-alert--good" role="status">
            QuickBooks Online was disconnected.
          </div>) : null}
        {error ? (<div className="qbo-alert qbo-alert--bad" role="alert">
            {decodeURIComponent(error)}
          </div>) : null}

        {modeMismatch ? (<div className="qbo-alert qbo-alert--bad" role="alert">
            <strong>Mode mismatch:</strong> QuickBooks is <strong>{environment}</strong> but Stripe is running with
            test keys. Test-mode ticket sales must not post to the live company file. Either switch Stripe to live
            keys before enabling the daily JE cron (Phase 9), or point QBO_ENVIRONMENT at sandbox during test
            checkouts.
          </div>) : null}

        <div className="qbo-card">
          <header className="qbo-card-header">
            <div>
              <p className="ticketing-portal-kicker">Status</p>
              <h2>{connection ? "Connected" : "Not connected"}</h2>
            </div>
            <span className={`qbo-status-pill qbo-status-pill--${connection ? "on" : "off"}`}>
              {connection ? "Live" : "Offline"}
            </span>
          </header>

          {connection ? (<>
              <dl className="qbo-details">
                <dt>Company (Realm ID)</dt>
                <dd>{connection.realmId}</dd>
                <dt>Environment</dt>
                <dd>{connection.environment}</dd>
                <dt>Connected</dt>
                <dd>{formatDate(connection.connectedAt)}</dd>
                <dt>Last refresh</dt>
                <dd>{formatDate(connection.updatedAt)}</dd>
                <dt>Refresh token expires</dt>
                <dd>{formatDate(connection.refreshTokenExpiresAt)}</dd>
              </dl>
              <div className="ticketing-portal-actions">
                <a className="ticketing-portal-primary" href={venuePath("/api/ticketing/qbo-authorize")}>
                  Reconnect
                </a>
                <form action={venuePath("/api/ticketing/qbo-disconnect")} method="post">
                  <button type="submit" className="ticketing-portal-secondary ticketing-portal-danger">
                    Disconnect
                  </button>
                </form>
              </div>
            </>) : (<>
              <p className="qbo-card-body">
                QuickBooks is not connected yet. The client can authorize their own company account later.
              </p>
              <div className="ticketing-portal-actions">
                {venue.localPreview ? <button className="ticketing-portal-primary" disabled title="QuickBooks is not connected yet">Connect to QuickBooks</button> : <a className="ticketing-portal-primary" href={venuePath("/api/ticketing/qbo-authorize")}>Connect to QuickBooks</a>}
              </div>
            </>)}
        </div>
      </section>
    </TicketingPortalShell>);
}
