import MenuPageView from "@/app/components/MenuPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function MenuPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const content = await getPublishedSiteContent(venue);
  return <MenuPageView content={content.menu} />;
}
