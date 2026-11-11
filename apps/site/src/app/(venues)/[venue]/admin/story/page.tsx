import AdminShell from "../AdminShell";
import AdminStoryEditor from "./AdminStoryEditor";
import { getStoryAssetDetails } from "@/lib/assetDetails";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminStoryPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  const content = await getDraftSiteContent(venue);
  const assetDetails = getStoryAssetDetails(content.story);

  return (
    <AdminShell venue={venue}>
      <AdminStoryEditor initialAssetDetails={assetDetails} initialContent={content.story} />
    </AdminShell>
  );
}
