import AdminShell from "../AdminShell";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listRoles, listUsers, ownerEmail, passwordsRetired } from "@/lib/accessStore";
import { isGoogleConfigured } from "@/lib/googleAuth";
import { venue } from "@/lib/venue";
import PeopleSettings from "./PeopleSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPeoplePage() {
  await requireAdminSession();
  if (!process.env.POSTGRES_URL) {
    return (
      <AdminShell>
        <section className="admin-mailing-list pb">
          <div className="admin-mailing-list-header"><h1>Settings</h1></div>
          <p className="admin-photos-warning">
            People &amp; access needs the venue&apos;s database. Connect Postgres (POSTGRES_URL) in Vercel and redeploy.
          </p>
        </section>
      </AdminShell>
    );
  }
  const [users, roles, retired] = await Promise.all([listUsers(), listRoles(), passwordsRetired()]);
  return (
    <AdminShell>
      <PeopleSettings
        users={users}
        roles={roles}
        venue={venue.name}
        google={isGoogleConfigured()}
        ownerSet={Boolean(ownerEmail())}
        retired={retired}
      />
    </AdminShell>
  );
}
