import PrivateEventsPageView from "@/app/components/PrivateEventsPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function PrivateEventsPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const content = await getPublishedSiteContent(venue);
  return <PrivateEventsPageView content={content.privateEvents} />;
}
