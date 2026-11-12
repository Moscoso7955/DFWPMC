import { notFound } from "next/navigation";
import CollectiveShell from "../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getPlay, listPeople } from "@/lib/playbookStore";
import { todayIn } from "@/lib/playbookShared";
import { isPhotoStorageConfigured } from "@/lib/r2";
import { COLLECTIVE as VENUE } from "@/lib/venues";
import { can } from "@/lib/session";
import { listContacts } from "@/lib/contactsStore";
import PlayView from "./PlayView";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <CollectiveShell layout="tool" title="Playbook">
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Playbook</h1></div>
          <p className="admin-photos-warning">
            Playbook needs the collective&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </CollectiveShell>
    );
  }

  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const today = todayIn(VENUE.timeZone);
  const [found, people, canBudget, canContacts] = await Promise.all([getPlay(id, today), listPeople(), can("playbook_budget"), can("contacts")]);
  const contacts = canContacts ? await listContacts() : [];
  if (!found) notFound();
  // Without budget access, the money stays out of the page entirely.
  const play = canBudget ? found : { ...found, budget: [], budgetCents: null, spentCents: 0 };
  return (
    <CollectiveShell layout="tool" title="Playbook">
      <PlayView play={play} people={people} today={today} storageReady={isPhotoStorageConfigured()} initialTab={tab ?? "countdown"} canBudget={canBudget} canContacts={canContacts} contacts={contacts} />
    </CollectiveShell>
  );
}
