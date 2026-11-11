import CollectiveShell from "../CollectiveShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listRoles, listUsers, ownerEmail, passwordsRetired } from "@/lib/accessStore";
import { isGoogleConfigured } from "@/lib/googleAuth";
import PeopleSettings from "./PeopleSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPeoplePage() {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <CollectiveShell>
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Settings</h1></div>
          <p className="admin-photos-warning">
            People &amp; access needs the collective&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </CollectiveShell>
    );
  }
  const [users, roles, retired] = await Promise.all([listUsers(), listRoles(), passwordsRetired()]);
  return (
    <CollectiveShell>
      <PeopleSettings
        users={users}
        roles={roles}
        venue="The Public Market"
        google={isGoogleConfigured()}
        ownerSet={Boolean(ownerEmail())}
        retired={retired}
      />
    </CollectiveShell>
  );
}
