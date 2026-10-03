import CareersPageView from "../components/CareersPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const content = await getPublishedSiteContent();
  return <CareersPageView content={content.careers} />;
}
