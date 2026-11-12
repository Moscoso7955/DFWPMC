import { notFound } from "next/navigation";
import CollectiveShell from "../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getNightForReview } from "@/lib/photoStore";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function AdminPhotoReviewPage({ params }: { params: Promise<{ id: string }> }) {
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
  const night = /^[0-9a-f-]{36}$/i.test(id) ? await getNightForReview(id) : null;
  if (!night) notFound();
  return (
    <CollectiveShell layout="tool" title="Photos">
      <ReviewClient night={night} />
    </CollectiveShell>
  );
}
