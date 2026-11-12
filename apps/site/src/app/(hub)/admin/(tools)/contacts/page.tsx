import CollectiveShell from "../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { contactPlays, listContacts } from "@/lib/contactsStore";
import ContactsView from "./ContactsView";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <CollectiveShell layout="tool" title="Contacts">
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Contacts</h1></div>
          <p className="admin-photos-warning">
            Contacts needs the collective&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </CollectiveShell>
    );
  }

  const [contacts, plays] = await Promise.all([listContacts(), contactPlays()]);
  return (
    <CollectiveShell layout="tool" title="Contacts">
      <ContactsView contacts={contacts} plays={plays} />
    </CollectiveShell>
  );
}
