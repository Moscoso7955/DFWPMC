import AdminShell from "../AdminShell";
import AdminMenuEditor from "./AdminMenuEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { getMenuImageAssetDetails } from "@/lib/assetDetails";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  const content = await getDraftSiteContent(venue);
  const imageDetails = getMenuImageAssetDetails(content.menu.image);

  return (
    <AdminShell venue={venue}>
      <AdminMenuEditor initialContent={content.menu} initialImageDetails={imageDetails} />
    </AdminShell>
  );
}
