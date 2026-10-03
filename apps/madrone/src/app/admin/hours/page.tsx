import AdminShell from "../AdminShell";
import AdminOperatingHoursEditor from "./AdminOperatingHoursEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminOperatingHoursPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <AdminOperatingHoursEditor initialHours={content.operatingHours} />
    </AdminShell>
  );
}
