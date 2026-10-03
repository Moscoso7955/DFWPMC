import CalendarPageView from "../components/CalendarPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const content = await getPublishedSiteContent();
  return <CalendarPageView content={content.calendar} />;
}
