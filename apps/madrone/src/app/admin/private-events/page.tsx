import AdminShell from "../AdminShell";
import AdminPrivateEventsEditor from "./AdminPrivateEventsEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPrivateEventsPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <AdminPrivateEventsEditor initialContent={content.privateEvents} />
    </AdminShell>
  );
}
