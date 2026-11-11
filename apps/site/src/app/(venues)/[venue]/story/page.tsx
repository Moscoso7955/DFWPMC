import StoryPageView from "@/app/components/StoryPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const content = await getPublishedSiteContent(venue);
  return <StoryPageView content={content.story} />;
}
