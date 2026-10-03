import SiteHomePage from "./components/SiteHomePage";
import { getInstagramHref } from "@/lib/instagramLink";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await getPublishedSiteContent();
  const instagramHref = getInstagramHref(content.contact.instagram ?? "");
  return <SiteHomePage content={content.homepage} instagramHref={instagramHref} />;
}
