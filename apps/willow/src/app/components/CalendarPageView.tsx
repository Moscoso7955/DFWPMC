"use client";
import { venuePath } from "@/lib/venue";
import Link from "next/link";
import CalendarPrototype from "./CalendarPrototype";
import HolderPage from "./HolderPage";
import type { CalendarContent, CalendarContentField } from "@/lib/siteContentSchema";
import { CALENDAR_FIELD_LABELS } from "@/lib/siteContentSchema";
import type { TicketedEvent } from "@/lib/ticketingTypes";
type TicketedEventPreview = Pick<TicketedEvent, "id" | "slug" | "title" | "startsAt" | "doorsAt" | "imageUrl" | "ageRestriction"> & {
    statusLabel: string;
    onSale: boolean;
};
type CalendarPageViewProps = {
    basePath?: string;
    content: CalendarContent;
    ticketedEvents?: TicketedEventPreview[];
    isAdmin?: boolean;
    onEdit?: (field: CalendarContentField) => void;
    onDayEdit?: (date: string) => void;
};
function CalendarEditButton({ field, onEdit, }: {
    field: CalendarContentField;
    onEdit?: (field: CalendarContentField) => void;
}) {
    if (!onEdit)
        return null;
    return (<button className={`admin-edit-hotspot admin-edit-hotspot--calendar-${field}`} type="button" onClick={() => onEdit(field)}>
      <span>Edit {CALENDAR_FIELD_LABELS[field]}</span>
    </button>);
}
const AGE_LABEL: Record<string, string> = {
    "21+": "21+",
    "18+": "18+",
    all_ages: "All ages",
};
function formatEventDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}
function formatEventTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
export default function CalendarPageView({ basePath = "", content, ticketedEvents = [], isAdmin = false, onEdit, onDayEdit, }: CalendarPageViewProps) {
    return (<HolderPage basePath={basePath} label="page 2 holder - calendar" pageClassName="page--calendar">
      <section className="calendar-page" aria-labelledby="calendar-page-title">
        <div className="calendar-heading">
          <h1 id="calendar-page-title" className={isAdmin ? "admin-calendar-edit-target" : undefined}>
            {content.title}
            {isAdmin ? <CalendarEditButton field="title" onEdit={onEdit}/> : null}
          </h1>
        </div>

        {ticketedEvents.length > 0 ? (<section className="ticketed-events-band" aria-label="Upcoming ticketed events">
            <h2>Upcoming Events</h2>
            <ul>
              {ticketedEvents.map((event) => (<li key={event.id}>
                  <Link href={`${basePath}/calendar/${event.slug}`} className="ticketed-events-card">
                    <div className="ticketed-events-card-body">
                      <p className="ticketed-events-card-date">
                        {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
                      </p>
                      <h3>{event.title}</h3>
                      <div className="ticketed-events-card-meta">
                        <span className="ticketed-events-card-age">
                          {AGE_LABEL[event.ageRestriction] ?? event.ageRestriction}
                        </span>
                        <span className={`ticketed-events-card-price${event.onSale ? "" : " ticketed-events-card-price--off"}`}>
                          {event.statusLabel}
                        </span>
                      </div>
                    </div>
                    {event.imageUrl ? (<div className="ticketed-events-card-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={venuePath(event.imageUrl)} alt="" loading="lazy"/>
                      </div>) : (<div className="ticketed-events-card-photo ticketed-events-card-photo--empty" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={venuePath("/assets/brand/venue-logo.svg")} alt="Willow"/>
                      </div>)}
                  </Link>
                </li>))}
            </ul>
          </section>) : null}

        <div className="calendar-prototype-band">
          <CalendarPrototype events={content.events} isAdmin={isAdmin} onAdminDayEdit={onDayEdit}/>
          <Link className="calendar-event-inquiry" href={`${basePath}/private-events`}>
            NEED TO INQUIRE ABOUT AN EVENT? <span>CLICK HERE</span>
          </Link>
        </div>
      </section>
    </HolderPage>);
}
