import CalendarPageView from "@/app/components/CalendarPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { filterEventsByHours } from "@/lib/operatingHours";
import { getSportsEvents } from "@/lib/sportsSchedule";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  const [content, sportsEvents] = await Promise.all([
    getPublishedSiteContent(venue),
    getSportsEvents(),
  ]);

  const gatedEvents = [...content.calendar.events, ...sportsEvents];
  const visibleEvents = filterEventsByHours(gatedEvents, content.operatingHours, content.calendar.openDates);

  return (
    <CalendarPageView
      content={{
        ...content.calendar,
        events: visibleEvents,
      }}
      operatingHours={content.operatingHours}
    />
  );
}
