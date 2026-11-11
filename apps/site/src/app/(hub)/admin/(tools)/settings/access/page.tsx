import CollectiveShell from "../../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listRoles } from "@/lib/accessStore";
import AccessGrid from "./AccessGrid";

export const dynamic = "force-dynamic";

export default async function SettingsAccessPage() {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <CollectiveShell>
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Settings</h1></div>
          <p className="admin-photos-warning">
            Roles &amp; access needs the collective&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </CollectiveShell>
    );
  }
  return (
    <CollectiveShell>
      <AccessGrid roles={await listRoles()} />
    </CollectiveShell>
  );
}
