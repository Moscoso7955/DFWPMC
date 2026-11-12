import CollectiveShell from "../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listPeople, listPlays } from "@/lib/playbookStore";
import { todayIn } from "@/lib/playbookShared";
import { COLLECTIVE as VENUE } from "@/lib/venues";
import NewPlay from "./NewPlay";

export const dynamic = "force-dynamic";

export default async function NewPlayPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
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
  const [plays, people, { from }] = await Promise.all([listPlays(today), listPeople(), searchParams]);
  return (
    <CollectiveShell layout="tool" title="Playbook">
      <NewPlay sources={plays} people={people.filter((p) => p.active)} today={today} initialSource={from ?? ""} />
    </CollectiveShell>
  );
}
