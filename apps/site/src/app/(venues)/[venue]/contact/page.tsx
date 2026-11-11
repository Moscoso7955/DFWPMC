import ContactPageView from "@/app/components/ContactPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const content = await getPublishedSiteContent(venue);
  return <ContactPageView content={content.contact} />;
}
