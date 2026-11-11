import SiteHomePage from "@/app/components/SiteHomePage";
import { getInstagramHref } from "@/lib/instagramLink";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const content = await getPublishedSiteContent(venue);
  const instagramHref = getInstagramHref(content.contact.instagram ?? "");
  return <SiteHomePage content={content.homepage} instagramHref={instagramHref} />;
}
