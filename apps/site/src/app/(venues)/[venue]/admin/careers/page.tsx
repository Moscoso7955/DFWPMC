import AdminShell from "../AdminShell";
import AdminCareersEditor from "./AdminCareersEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminCareersPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  const content = await getDraftSiteContent(venue);

  return (
    <AdminShell venue={venue}>
      <AdminCareersEditor initialContent={content.careers} />
    </AdminShell>
  );
}
