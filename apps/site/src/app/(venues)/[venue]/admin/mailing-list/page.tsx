import AdminShell from "../AdminShell";
import MailingListFilter from "./MailingListFilter";
import { listSubscribers } from "@/lib/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
const SOURCE_LABELS: Record<string, string> = {
    newsletter: "Newsletter signup",
    contact_form: "Contact form",
    ticket_purchase: "Ticket purchase",
};
function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
export default async function AdminMailingListPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
    await requireAdminSession();
    const subscribers = await listSubscribers(venue);
    return (<AdminShell venue={venue} layout="tool">
      <section className="admin-mailing-list">
        <div className="admin-mailing-list-header">
          <h1>Mailing List</h1>
          <a className="admin-mailing-list-export" href={`${venue.basePath}/admin/api/mailing-list-export`}>
            Export CSV
          </a>
        </div>
        <p className="admin-mailing-list-note">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}. Includes the newsletter signup on the
          contact page and anyone who submits the contact form.
        </p>
        {subscribers.length === 0 ? (<p>No subscribers yet.</p>) : (<><MailingListFilter tableId="mailing-list-table" total={subscribers.length} /><div className="admin-table-scroll"><table className="admin-mailing-list-table" id="mailing-list-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (<tr key={subscriber.id}>
                  <td>{subscriber.name || "—"}</td>
                  <td>
                    <a href={(`mailto:${subscriber.email}`)}>{subscriber.email}</a>
                  </td>
                  <td>
                    {subscriber.phone ? (<a href={(`tel:${subscriber.phone.replace(/[^\d+]/g, "")}`)}>{subscriber.phone}</a>) : ("—")}
                  </td>
                  <td>{SOURCE_LABELS[subscriber.source] ?? subscriber.source}</td>
                  <td className="admin-nowrap">{formatDate(subscriber.createdAt)}</td>
                </tr>))}
            </tbody>
          </table></div></>)}
      </section>
    </AdminShell>);
}
