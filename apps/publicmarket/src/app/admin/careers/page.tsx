import AdminShell from "../AdminShell";
import AdminCareersEditor from "./AdminCareersEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCareersPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <AdminCareersEditor initialContent={content.careers} />
    </AdminShell>
  );
}
