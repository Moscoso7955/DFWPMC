import CollectiveShell from "../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listDueSoon, listPlays } from "@/lib/playbookStore";
import { todayIn } from "@/lib/playbookShared";
import { COLLECTIVE as VENUE } from "@/lib/venues";
import { can } from "@/lib/session";
import PlaybookHome from "./PlaybookHome";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
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

  const today = todayIn(VENUE.timeZone);
  const [all, due, canBudget, canPeople] = await Promise.all([listPlays(today), listDueSoon(today), can("playbook_budget"), can("people")]);
  const plays = canBudget ? all : all.map((p) => ({ ...p, budgetCents: null, spentCents: 0 }));
  return (
    <CollectiveShell layout="tool" title="Playbook">
      <PlaybookHome plays={plays} due={due} today={today} venue={VENUE.name} canPeople={canPeople} />
    </CollectiveShell>
  );
}
