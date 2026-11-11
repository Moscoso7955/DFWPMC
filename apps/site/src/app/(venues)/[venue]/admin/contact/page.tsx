import AdminShell from "../AdminShell";
import AdminContactEditor from "./AdminContactEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
export default async function AdminContactPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
    await requireAdminSession();
    const content = await getDraftSiteContent(venue);
    return (<AdminShell venue={venue}>
      <div className="admin-contact-toolbar">
        <a className="admin-contact-toolbar-link" href={`${venue.basePath}/admin/submissions`}>
          View Form Submissions
        </a>
        <a className="admin-contact-toolbar-link" href={`${venue.basePath}/admin/mailing-list`}>
          Mailing List
        </a>
      </div>
      <AdminContactEditor initialContent={content.contact}/>
    </AdminShell>);
}
