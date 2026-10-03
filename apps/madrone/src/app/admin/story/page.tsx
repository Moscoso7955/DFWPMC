import AdminShell from "../AdminShell";
import AdminStoryEditor from "./AdminStoryEditor";
import { getStoryAssetDetails } from "@/lib/assetDetails";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminStoryPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();
  const assetDetails = getStoryAssetDetails(content.story);

  return (
    <AdminShell>
      <AdminStoryEditor initialAssetDetails={assetDetails} initialContent={content.story} />
    </AdminShell>
  );
}
