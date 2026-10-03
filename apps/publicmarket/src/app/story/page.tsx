import StoryPageView from "../components/StoryPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const content = await getPublishedSiteContent();
  return <StoryPageView content={content.story} />;
}
