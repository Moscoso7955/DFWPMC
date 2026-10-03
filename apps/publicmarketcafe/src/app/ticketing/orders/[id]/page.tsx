import { venuePath } from "@/lib/venue";
import Link from "next/link";
import { getEventById, getOrderWithDetails } from "@/lib/ticketingStore";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { notFound, redirect } from "next/navigation";
import TicketingPortalShell from "../../TicketingPortalShell";
import OrderActions from "./OrderActions";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        id: string;
    }>;
};
function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
    });
}
export default async function OrderDetailPage({ params }: PageProps) {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const { id } = await params;
    const details = await getOrderWithDetails(id);
    if (!details)
        notFound();
    const { order, items, tickets } = details;
    const event = await getEventById(order.eventId);
    if (!event)
        notFound();
    const refundable = order.status === "paid" || order.status === "partially_refunded";
    return (<TicketingPortalShell role="manager">
      <section className="ticketing-portal-section">
        <div className="ticketing-portal-crumbs">
          <Link href={`/ticketing/events/${event.id}/orders`}>← Orders</Link>
        </div>

        <div className="ticketing-portal-header-row">
          <div>
            <p className="ticketing-portal-kicker">Order</p>
            <h1>{order.buyerName}</h1>
            <p className="ticketing-portal-sub">
              {order.buyerEmail}
              {order.buyerPhone ? ` · ${order.buyerPhone}` : ""} ·{" "}
              <span className={`ticketing-orders-status ticketing-orders-status--${order.status}`}>
                {order.status.replace("_", " ")}
              </span>
              {order.isComp ? " · comp" : ""}
            </p>
          </div>
        </div>

        <div className="ticketing-portal-editor-grid">
          <section className="ticketing-portal-pane" aria-label="Summary">
            <header className="ticketing-portal-pane-header">
              <h2>Summary</h2>
            </header>
            <dl className="qbo-details">
              <dt>Event</dt>
              <dd>{event.title}</dd>
              <dt>Placed</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
              {order.paidAt ? (<>
                  <dt>Paid</dt>
                  <dd>{formatDateTime(order.paidAt)}</dd>
                </>) : null}
              {order.stripePaymentIntentId ? (<>
                  <dt>Payment Intent</dt>
                  <dd className="ticket-page-mono">{order.stripePaymentIntentId}</dd>
                </>) : null}
            </dl>

            <table className="ticketing-orders-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (<tr key={item.id}>
                    <td>{item.tierName}</td>
                    <td>{item.quantity}</td>
                    <td>${(item.unitPriceCents / 100).toFixed(2)}</td>
                    <td>${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}</td>
                  </tr>))}
                <tr>
                  <td colSpan={3}>Subtotal</td>
                  <td>${(order.subtotalCents / 100).toFixed(2)}</td>
                </tr>
                {order.discountCents > 0 ? (<tr>
                    <td colSpan={3}>Discount</td>
                    <td>-${(order.discountCents / 100).toFixed(2)}</td>
                  </tr>) : null}
                <tr>
                  <td colSpan={3}>Service fee</td>
                  <td>${(order.serviceFeeCents / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>Tax</td>
                  <td>${(order.taxCents / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>${(order.totalCents / 100).toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="ticketing-portal-pane" aria-label="Tickets & actions">
            <header className="ticketing-portal-pane-header">
              <h2>Tickets</h2>
            </header>
            {tickets.length === 0 ? (<p className="ticketing-portal-hint">No tickets issued yet.</p>) : (<OrderActions orderId={order.id} isPaid={order.status === "paid"} refundable={refundable} tickets={tickets.map((t) => ({
                id: t.id,
                token: t.token,
                status: t.status,
            }))}/>)}
          </section>
        </div>
      </section>
    </TicketingPortalShell>);
}
