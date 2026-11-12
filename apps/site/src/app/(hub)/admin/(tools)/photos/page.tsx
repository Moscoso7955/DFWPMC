import CollectiveShell from "../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listContributors, listNightsForAdmin } from "@/lib/photoStore";
import { isPhotoStorageConfigured } from "@/lib/r2";
import AdminPhotosView from "./AdminPhotosView";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
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

  const [nights, contributors] = await Promise.all([listNightsForAdmin(), listContributors()]);
  return (
    <CollectiveShell layout="tool" title="Photos">
      <AdminPhotosView nights={nights} contributors={contributors} storageReady={isPhotoStorageConfigured()} />
    </CollectiveShell>
  );
}
