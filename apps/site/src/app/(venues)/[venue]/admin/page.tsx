import AdminHomeEditor from "./AdminHomeEditor";
import AdminShell from "./AdminShell";
import { getHomepageAssetDetails } from "@/lib/assetDetails";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  const content = await getDraftSiteContent(venue);
  const assetDetails = getHomepageAssetDetails(content.homepage);

  return (
    <AdminShell venue={venue}>
      <AdminHomeEditor initialAssetDetails={assetDetails} initialContent={content.homepage} />
    </AdminShell>
  );
}
