import AdminShell from "../AdminShell";
import AdminReservationsEditor from "./AdminReservationsEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <AdminReservationsEditor initialContent={content.reservations} />
    </AdminShell>
  );
}
