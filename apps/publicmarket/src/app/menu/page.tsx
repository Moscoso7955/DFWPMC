import MenuPageView from "../components/MenuPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const content = await getPublishedSiteContent();
  return <MenuPageView content={content.menu} />;
}
