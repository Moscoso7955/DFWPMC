import { venuePath } from "@/lib/venue";
import AdminShell from "../AdminShell";
import { listSubscribers } from "@/lib/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";
export const dynamic = "force-dynamic";
const SOURCE_LABELS: Record<string, string> = {
    newsletter: "Newsletter signup",
    contact_form: "Contact form",
    ticket_purchase: "Ticket purchase",
};
function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
export default async function AdminMailingListPage() {
    await requireAdminSession();
    const subscribers = await listSubscribers();
    return (<AdminShell>
      <section className="admin-mailing-list">
        <a className="admin-back-link" href={venuePath("/admin/analytics")}>
          <span aria-hidden="true">←</span> Analytics
        </a>
        <div className="admin-mailing-list-header">
          <h1>Mailing List</h1>
          <a className="admin-mailing-list-export" href={venuePath("/admin/api/mailing-list-export")}>
            Export CSV
          </a>
        </div>
        <p className="admin-mailing-list-note">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}. Includes the newsletter signup on the
          contact page and anyone who submits the contact form.
        </p>
        {subscribers.length === 0 ? (<p>No subscribers yet.</p>) : (<table className="admin-mailing-list-table">
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
                    <a href={venuePath(`mailto:${subscriber.email}`)}>{subscriber.email}</a>
                  </td>
                  <td>
                    {subscriber.phone ? (<a href={venuePath(`tel:${subscriber.phone.replace(/[^\d+]/g, "")}`)}>{subscriber.phone}</a>) : ("—")}
                  </td>
                  <td>{SOURCE_LABELS[subscriber.source] ?? subscriber.source}</td>
                  <td>{formatDate(subscriber.createdAt)}</td>
                </tr>))}
            </tbody>
          </table>)}
      </section>
    </AdminShell>);
}
