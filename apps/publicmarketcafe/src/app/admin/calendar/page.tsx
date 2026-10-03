import { venuePath } from "@/lib/venue";
import AdminShell from "../AdminShell";
import AdminCalendarEditor from "./AdminCalendarEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
export const dynamic = "force-dynamic";
export default async function AdminCalendarPage() {
    await requireAdminSession();
    const content = await getDraftSiteContent();
    return (<AdminShell>
      <div className="admin-contact-toolbar">
        <a className="admin-contact-toolbar-link" href={venuePath("/admin/hours")}>
          Set Operating Hours
        </a>
      </div>
      <AdminCalendarEditor initialContent={content.calendar}/>
    </AdminShell>);
}
