import { notFound } from "next/navigation";
import CollectiveShell from "../../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getContestDashboard } from "@/lib/contestStore";
import { isPhotoCheckConfigured } from "@/lib/contestCheck";
import PhotoEventDashboard from "./PhotoEventDashboard";

export const dynamic = "force-dynamic";

export default async function PhotoEventPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const dashboard = await getContestDashboard(id);
  if (!dashboard) notFound();
  return (
    <CollectiveShell layout="tool" title="Photos">
      <PhotoEventDashboard initial={dashboard} checkReady={isPhotoCheckConfigured()} />
    </CollectiveShell>
  );
}
