import AdminHomeEditor from "./AdminHomeEditor";
import AdminShell from "./AdminShell";
import { getHomepageAssetDetails } from "@/lib/assetDetails";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();
  const assetDetails = getHomepageAssetDetails(content.homepage);

  return (
    <AdminShell homepage>
      <AdminHomeEditor initialAssetDetails={assetDetails} initialContent={content.homepage} />
    </AdminShell>
  );
}
