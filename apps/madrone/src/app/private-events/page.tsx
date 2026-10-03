import PrivateEventsPageView from "../components/PrivateEventsPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function PrivateEventsPage() {
  const content = await getPublishedSiteContent();
  return <PrivateEventsPageView content={content.privateEvents} />;
}
