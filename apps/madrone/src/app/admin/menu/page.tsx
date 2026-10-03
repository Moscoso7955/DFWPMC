import AdminShell from "../AdminShell";
import AdminMenuEditor from "./AdminMenuEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { getMenuImageAssetDetails } from "@/lib/assetDetails";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireAdminSession();
  const content = await getDraftSiteContent();
  const imageDetails = getMenuImageAssetDetails(content.menu.image);

  return (
    <AdminShell>
      <AdminMenuEditor initialContent={content.menu} initialImageDetails={imageDetails} />
    </AdminShell>
  );
}
