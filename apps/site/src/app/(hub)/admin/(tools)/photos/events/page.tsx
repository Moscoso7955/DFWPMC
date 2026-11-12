import CollectiveShell from "../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listContests } from "@/lib/contestStore";
import { isPhotoCheckConfigured } from "@/lib/contestCheck";
import PhotoEventsView from "./PhotoEventsView";

export const dynamic = "force-dynamic";

export default async function PhotoEventsPage() {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <CollectiveShell layout="tool" title="Photos">
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Photos</h1></div>
          <p className="admin-photos-warning">
            Photo nights need the collective&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </CollectiveShell>
    );
  }

  const contests = await listContests();
  return (
    <CollectiveShell layout="tool" title="Photos">
      <PhotoEventsView contests={contests} checkReady={isPhotoCheckConfigured()} />
    </CollectiveShell>
  );
}
