import AdminShell from "../AdminShell";
import AdminCalendarEditor from "./AdminCalendarEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
export default async function AdminCalendarPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
    await requireAdminSession();
    const content = await getDraftSiteContent(venue);
    return (<AdminShell venue={venue} shortcuts={[{ href: `${venue.basePath}/admin/hours`, label: "Set operating hours" }]}>
      <div className="admin-contact-toolbar">
        <a className="admin-contact-toolbar-link" href={`${venue.basePath}/admin/hours`}>
          Set Operating Hours
        </a>
      </div>
      <AdminCalendarEditor initialContent={content.calendar} operatingHours={content.operatingHours}/>
    </AdminShell>);
}
