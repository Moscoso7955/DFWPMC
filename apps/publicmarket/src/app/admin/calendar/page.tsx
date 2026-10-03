import AdminShell from "../AdminShell";
import AdminCalendarEditor from "./AdminCalendarEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <AdminCalendarEditor initialContent={content.calendar} />
    </AdminShell>
  );
}
