import { generateTicketQrDataUri } from "@/lib/qrCode";
import { getSiteUrl } from "@/lib/stripe";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config";
import { getTicketPassData } from "@/lib/ticketingStore";
import { venue, venuePath } from "@/lib/venue";
import PreviewNotice from "@/app/components/PreviewNotice";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        token: string;
    }>;
};
type TicketRow = {
    token: string;
    status: "valid" | "checked_in" | "void";
    holder_name: string | null;
    tier_name: string;
    event_title: string;
    event_starts_at: string;
    event_doors_at: string | null;
    event_slug: string;
    event_age_restriction: "21+" | "18+" | "all_ages";
};
const AGE_LABEL: Record<string, string> = {
    "21+": "21+ · Photo ID required",
    "18+": "18+ · Photo ID required",
    all_ages: "All ages",
};
function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}
function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
export default async function TicketPage({ params }: PageProps) {
    const { token } = await params;
    const raw = await getTicketPassData(token);
    if (!raw)
        notFound();
    const ticket: TicketRow = {
        token: raw.token, status: raw.status, holder_name: raw.holderName, tier_name: raw.tierName,
        event_title: raw.eventTitle, event_starts_at: raw.eventStartsAt, event_doors_at: raw.eventDoorsAt,
        event_slug: raw.eventSlug, event_age_restriction: raw.eventAgeRestriction,
    };
    const qrDataUri = await generateTicketQrDataUri(`${getSiteUrl()}/t/${ticket.token}`);
    const isVoid = ticket.status === "void";
    const isChecked = ticket.status === "checked_in";
    const walletEnabled = isAppleWalletConfigured();
    const googleWalletEnabled = isGoogleWalletConfigured();
    return (<main className={`ticket-page ticket-page--${ticket.status}`}>
      <section className="ticket-page-card">
        <PreviewNotice />
        <header className="ticket-page-header">
          <p className="ticket-page-kicker">{formatDate(ticket.event_starts_at)}</p>
          <h1>{ticket.event_title}</h1>
          <p className="ticket-page-time">
            {ticket.event_doors_at ? <>Doors {formatTime(ticket.event_doors_at)} · </> : null}
            Starts {formatTime(ticket.event_starts_at)}
          </p>
        </header>

        <div className="ticket-page-qr" aria-hidden={isVoid}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={venuePath(qrDataUri)} alt="Scan at door"/>
          {isVoid ? <div className="ticket-page-overlay">Void</div> : null}
          {isChecked ? <div className="ticket-page-overlay ticket-page-overlay--ok">Checked In</div> : null}
        </div>

        {!isVoid && (walletEnabled || googleWalletEnabled) ? (<div className="wallet-buttons">
            {walletEnabled ? (<a className="apple-wallet-button" href={venuePath(`/t/${ticket.token}/wallet/apple`)}>
                Add to Apple Wallet
              </a>) : null}
            {googleWalletEnabled ? (<a className="google-wallet-button" href={venuePath(`/t/${ticket.token}/wallet/google`)}>
                Add to Google Wallet
              </a>) : null}
          </div>) : null}

        {venue.localPreview ? <div className="wallet-buttons"><button className="apple-wallet-button" disabled title="Apple Wallet is not connected">Add to Apple Wallet</button><button className="google-wallet-button" disabled title="Google Wallet is not connected">Add to Google Wallet</button><p className="local-provider-note">Wallet delivery is not connected yet.</p></div> : null}
        <dl className="ticket-page-meta">
          <dt>Tier</dt>
          <dd>{ticket.tier_name}</dd>
          {ticket.holder_name ? (<>
              <dt>Holder</dt>
              <dd>{ticket.holder_name}</dd>
            </>) : null}
          <dt>Entry</dt>
          <dd>{AGE_LABEL[ticket.event_age_restriction] ?? ticket.event_age_restriction}</dd>
          <dt>Ticket #</dt>
          <dd className="ticket-page-mono">{ticket.token.slice(0, 12).toUpperCase()}</dd>
        </dl>

        <footer className="ticket-page-footer">
          <p>Willow · Venue address to be added</p>
          <p>
            <a href={venuePath(`/calendar/${ticket.event_slug}`)}>Event details</a> ·{" "}
            <a href={venuePath("/privacy")}>Privacy</a> · <a href={venuePath("/terms")}>Terms</a>
          </p>
        </footer>
      </section>
    </main>);
}
