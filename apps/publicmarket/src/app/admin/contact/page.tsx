import AdminShell from "../AdminShell";
import AdminContactEditor from "./AdminContactEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminContactPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();

  return (
    <AdminShell>
      <div className="admin-contact-toolbar">
        <a className="admin-contact-toolbar-link" href="/admin/submissions">
          View Form Submissions
        </a>
        <a className="admin-contact-toolbar-link" href="/admin/mailing-list">
          Mailing List
        </a>
      </div>
      <AdminContactEditor initialContent={content.contact} />
    </AdminShell>
  );
}
