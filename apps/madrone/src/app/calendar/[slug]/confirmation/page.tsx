import { venue, venuePath } from "@/lib/venue";
import PreviewNotice from "@/app/components/PreviewNotice";
import HolderPage from "@/app/components/HolderPage";
import Link from "next/link";
import { getOrderById, getPublishedEventBySlug, getTicketsForOrder, } from "@/lib/ticketingStore";
import { generateTicketQrDataUri } from "@/lib/qrCode";
import { getSiteUrl } from "@/lib/stripe";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/wallet/config";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        slug: string;
    }>;
    searchParams?: Promise<{
        order?: string;
        session?: string;
    }>;
};
function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "full",
        timeStyle: "short",
    });
}
export default async function ConfirmationPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const query = searchParams ? await searchParams : {};
    const orderId = query.order;
    if (!orderId)
        notFound();
    const [event, order] = await Promise.all([getPublishedEventBySlug(slug), getOrderById(orderId)]);
    if (!event || !order || order.eventId !== event.id)
        notFound();
    const tickets = order.status === "paid" ? await getTicketsForOrder(order.id) : [];
    const isPending = order.status === "pending";
    const siteUrl = getSiteUrl();
    const walletEnabled = isAppleWalletConfigured();
    const googleWalletEnabled = isGoogleWalletConfigured();
    const qrDataUris = await Promise.all(tickets.map((t) => generateTicketQrDataUri(`${siteUrl}/t/${t.token}`)));
    return (<HolderPage label="ticket confirmation" pageClassName="page--ticketed-event">
      <article className="ticket-confirmation">
        <PreviewNotice />
        <header className="ticket-confirmation-header">
          <p className="ticket-confirmation-kicker">
            {order.status === "paid" ? "You're in" : isPending ? "Almost there" : `Order ${order.status}`}
          </p>
          <h1>{event.title}</h1>
          <p>{formatDateTime(event.startsAt)}</p>
        </header>

        {order.status === "paid" ? (<>
            <section className="ticket-confirmation-note">
              <p>
                {venue.localPreview ? <>Sample order for <strong>{order.buyerName}</strong>. Email delivery is not connected. These QR codes are preview tickets.</> : <>Thanks, {order.buyerName.split(" ")[0]}. We&apos;ve emailed your tickets to <strong>{order.buyerEmail}</strong>. Show the QR at the door.</>}
              </p>
            </section>

            <section className="ticket-confirmation-tickets" aria-label="Your tickets">
              <h2>
                {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
              </h2>
              <div className="ticket-confirmation-grid">
                {tickets.map((ticket, idx) => (<div key={ticket.id} className="ticket-confirmation-ticket">
                    <div className="ticket-confirmation-qr">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={venuePath(qrDataUris[idx])} alt="Scan at door"/>
                    </div>
                    <p className="ticket-confirmation-ticket-id">
                      Ticket #{ticket.token.slice(0, 8).toUpperCase()}
                    </p>
                    {walletEnabled || googleWalletEnabled ? (<div className="wallet-buttons">
                        {walletEnabled ? (<a className="apple-wallet-button" href={venuePath(`/t/${ticket.token}/wallet/apple`)}>
                            Add to Apple Wallet
                          </a>) : null}
                        {googleWalletEnabled ? (<a className="google-wallet-button" href={venuePath(`/t/${ticket.token}/wallet/google`)}>
                            Add to Google Wallet
                          </a>) : null}
                      </div>) : null}
                    {venue.localPreview ? <div className="wallet-buttons"><button className="apple-wallet-button" disabled>Add to Apple Wallet</button><button className="google-wallet-button" disabled>Add to Google Wallet</button><p className="local-provider-note">Wallet delivery is not connected yet.</p></div> : null}
                    <Link href={`/t/${ticket.token}`} className="ticket-confirmation-ticket-link">
                      Open full ticket →
                    </Link>
                  </div>))}
              </div>
            </section>

            <section className="ticket-confirmation-actions" aria-label="Add to calendar">
              <a href={venuePath(`/api/ticketing/orders/${order.id}/ical`)} className="ticket-confirmation-action">
                Add to calendar (.ics)
              </a>
            </section>
          </>) : isPending ? (<section className="ticket-confirmation-note">
            <p>
              Payment is still processing. If you completed checkout, this page will refresh with your tickets in a
              few seconds. Otherwise, you can{" "}
              <Link href={`/calendar/${event.slug}`}>return to the event</Link> and try again.
            </p>
          </section>) : (<section className="ticket-confirmation-note">
            <p>
              This order is <strong>{order.status}</strong>. If this looks wrong, please contact us.
            </p>
          </section>)}

        <footer className="ticket-confirmation-footer">
          <Link href={`/calendar/${event.slug}`}>← Back to event</Link>
        </footer>
      </article>
    </HolderPage>);
}
