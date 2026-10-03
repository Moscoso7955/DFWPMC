import ReservationsPageView from "../components/ReservationsPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const content = await getPublishedSiteContent();
  return <ReservationsPageView content={content.reservations} />;
}
