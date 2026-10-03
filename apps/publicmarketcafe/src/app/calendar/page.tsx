import CalendarPageView from "../components/CalendarPageView";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { filterEventsByHours } from "@/lib/operatingHours";
import { getSportsEvents } from "@/lib/sportsSchedule";
import { getPublicTiersForEvent, listPublishedEvents } from "@/lib/ticketingStore";
import type { CalendarEventContent } from "@/lib/siteContentSchema";
import { availabilityLabel, getAvailability } from "@/lib/ticketAvailability";

export const dynamic = "force-dynamic";

function ticketedDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function ticketedTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function CalendarPage() {
  const [content, sportsEvents, ticketedEvents] = await Promise.all([
    getPublishedSiteContent(),
    getSportsEvents(),
    listPublishedEvents(),
  ]);

  const ticketedPreviews = await Promise.all(
    ticketedEvents.map(async (event) => {
      const tiers = await getPublicTiersForEvent(event.id);
      const availability = getAvailability(tiers);
      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        startsAt: event.startsAt,
        doorsAt: event.doorsAt,
        imageUrl: event.imageUrl,
        ageRestriction: event.ageRestriction,
        statusLabel: availabilityLabel(availability),
        onSale: availability.state === "on_sale",
      };
    }),
  );

  // Also render each ticketed event as a note in the day cell so buyers
  // land on the actual date, not just the top strip. Use the `ticketed-`
  // id prefix so CalendarPrototype's variant picker styles it as a red
  // "tickets on sale" pill and the modal's More Info link deep-links to
  // the ticket page.
  const ticketedNotes: CalendarEventContent[] = ticketedPreviews.map((event) => {
    const priceCopy = event.onSale ? `Tickets ${event.statusLabel}.` : `${event.statusLabel}.`;
    return {
      id: `ticketed-${event.slug}`,
      date: ticketedDateKey(event.startsAt),
      title: event.title,
      time: event.doorsAt
        ? `Doors ${ticketedTimeLabel(event.doorsAt)} · Show ${ticketedTimeLabel(event.startsAt)}`
        : `Starts ${ticketedTimeLabel(event.startsAt)}`,
      description: priceCopy,
      url: `/calendar/${event.slug}`,
    };
  });

  // Ticketed events run on Public Market Cafe & Goods's terms — they can be booked on
  // an otherwise-closed day (private show, holiday one-off), so they
  // bypass the open-hours filter and always render.
  const gatedEvents = [...content.calendar.events, ...sportsEvents];
  const visibleEvents = [
    ...filterEventsByHours(gatedEvents, content.operatingHours),
    ...ticketedNotes,
  ];

  return (
    <CalendarPageView
      content={{
        ...content.calendar,
        events: visibleEvents,
      }}
      ticketedEvents={ticketedPreviews}
    />
  );
}
