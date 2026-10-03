import SiteHomePage from "./components/SiteHomePage";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await getPublishedSiteContent();
  return <SiteHomePage content={content.homepage} />;
}
