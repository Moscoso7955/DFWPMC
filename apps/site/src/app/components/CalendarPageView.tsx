"use client";
import { useVenue } from "./VenueProvider";
import Link from "next/link";
import CalendarPrototype from "./CalendarPrototype";
import HolderPage from "./HolderPage";
import type { CalendarContent, CalendarContentField, OperatingHoursContent } from "@/lib/siteContentSchema";
import { CALENDAR_FIELD_LABELS } from "@/lib/siteContentSchema";
type CalendarPageViewProps = {
    basePath?: string;
    content: CalendarContent;
    operatingHours?: OperatingHoursContent;
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
export default function CalendarPageView({ basePath = "", content, operatingHours, isAdmin = false, onEdit, onDayEdit, }: CalendarPageViewProps) {
    const { venue, venuePath } = useVenue();
    const base = basePath ? venuePath(basePath) : venue.basePath;
    return (<HolderPage basePath={basePath} label="page 2 holder - calendar" pageClassName="page--calendar">
      <section className="calendar-page" aria-labelledby="calendar-page-title">
        <div className="calendar-heading">
          <h1 id="calendar-page-title" className={isAdmin ? "admin-calendar-edit-target" : undefined}>
            {content.title}
            {isAdmin ? <CalendarEditButton field="title" onEdit={onEdit}/> : null}
          </h1>
        </div>

        

        <div className="calendar-prototype-band">
          <CalendarPrototype events={content.events} closedDates={content.closedDates} openDates={content.openDates} operatingHours={operatingHours} isAdmin={isAdmin} onAdminDayEdit={onDayEdit}/>
          <Link className="calendar-event-inquiry" href={`${base}/private-events`}>
            NEED TO INQUIRE ABOUT AN EVENT? <span>CLICK HERE</span>
          </Link>
        </div>
      </section>
    </HolderPage>);
}
