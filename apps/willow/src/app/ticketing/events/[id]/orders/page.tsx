import { venuePath } from "@/lib/venue";
import { getEventById, listOrdersForEvent } from "@/lib/ticketingStore";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import TicketingPortalShell from "../../../TicketingPortalShell";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams?: Promise<{
        q?: string;
        status?: string;
    }>;
};
function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
    });
}
const STATUS_OPTIONS = ["", "paid", "pending", "expired", "refunded", "partially_refunded", "disputed"];
export default async function EventOrdersPage({ params, searchParams }: PageProps) {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const { id } = await params;
    const query = searchParams ? await searchParams : {};
    const event = await getEventById(id);
    if (!event)
        notFound();
    const orders = await listOrdersForEvent(id, {
        search: query.q,
        status: query.status as never,
    });
    const totalSold = orders
        .filter((o) => o.status === "paid" || o.status === "partially_refunded")
        .reduce((sum, o) => sum + o.ticketCount, 0);
    const totalCheckedIn = orders.reduce((sum, o) => sum + o.checkedInCount, 0);
    return (<TicketingPortalShell role="manager">
      <section className="ticketing-portal-section">
        <div className="ticketing-portal-crumbs">
          <Link href={`/ticketing/events/${id}`}>← {event.title}</Link>
        </div>

        <div className="ticketing-portal-header-row">
          <div>
            <p className="ticketing-portal-kicker">Orders</p>
            <h1>{event.title}</h1>
            <p className="ticketing-portal-sub">
              {orders.length} orders · {totalSold} tickets · {totalCheckedIn} checked in
            </p>
          </div>
          <div className="ticketing-portal-actions">
            <a className="ticketing-portal-secondary" href={venuePath(`/ticketing/api/events/${id}/guest-list`)} download>
              Guest list CSV
            </a>
          </div>
        </div>

        <form className="ticketing-orders-filter" method="get">
          <input type="search" name="q" defaultValue={query.q ?? ""} placeholder="Search by name or email"/>
          <select name="status" defaultValue={query.status ?? ""}>
            {STATUS_OPTIONS.map((s) => (<option key={s || "any"} value={s}>
                {s ? s.replace("_", " ") : "All statuses"}
              </option>))}
          </select>
          <button type="submit" className="ticketing-portal-secondary">
            Apply
          </button>
        </form>

        {orders.length === 0 ? (<p className="ticketing-portal-hint">No orders match.</p>) : (<table className="ticketing-orders-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Email</th>
                <th>Status</th>
                <th>Tickets</th>
                <th>Total</th>
                <th>Placed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (<tr key={order.id}>
                  <td>
                    {order.buyerName}
                    {order.isComp ? <span className="ticketing-orders-comp"> · comp</span> : null}
                  </td>
                  <td>{order.buyerEmail}</td>
                  <td>
                    <span className={`ticketing-orders-status ticketing-orders-status--${order.status}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    {order.checkedInCount}/{order.ticketCount}
                  </td>
                  <td>${(order.totalCents / 100).toFixed(2)}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <Link href={`/ticketing/orders/${order.id}`} className="ticketing-portal-secondary">
                      Open
                    </Link>
                  </td>
                </tr>))}
            </tbody>
          </table>)}
      </section>
    </TicketingPortalShell>);
}
