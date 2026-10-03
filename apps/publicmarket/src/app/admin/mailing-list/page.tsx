import AdminShell from "../AdminShell";
import { listSubscribers } from "@/lib/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  newsletter: "Newsletter signup",
  contact_form: "Contact form",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminMailingListPage() {
  await requireAdminSession();
  const subscribers = await listSubscribers();

  return (
    <AdminShell>
      <section className="admin-mailing-list">
        <div className="admin-mailing-list-header">
          <h1>Mailing List</h1>
          <a className="admin-mailing-list-export" href="/admin/api/mailing-list-export">
            Export CSV
          </a>
        </div>
        <p className="admin-mailing-list-note">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}. Includes the newsletter signup on the
          contact page and anyone who submits the contact form.
        </p>
        {subscribers.length === 0 ? (
          <p>No subscribers yet.</p>
        ) : (
          <table className="admin-mailing-list-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Source</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>
                    <a href={`mailto:${subscriber.email}`}>{subscriber.email}</a>
                  </td>
                  <td>{SOURCE_LABELS[subscriber.source] ?? subscriber.source}</td>
                  <td>{formatDate(subscriber.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
