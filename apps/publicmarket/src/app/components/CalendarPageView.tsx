"use client";

import Link from "next/link";
import CalendarPrototype from "./CalendarPrototype";
import HolderPage from "./HolderPage";
import type { CalendarContent, CalendarContentField } from "@/lib/siteContentSchema";
import { CALENDAR_FIELD_LABELS } from "@/lib/siteContentSchema";

type CalendarPageViewProps = {
  basePath?: string;
  content: CalendarContent;
  isAdmin?: boolean;
  onEdit?: (field: CalendarContentField) => void;
  onDayEdit?: (date: string) => void;
};

function CalendarEditButton({
  field,
  onEdit,
}: {
  field: CalendarContentField;
  onEdit?: (field: CalendarContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button
      className={`admin-edit-hotspot admin-edit-hotspot--calendar-${field}`}
      type="button"
      onClick={() => onEdit(field)}
    >
      <span>Edit {CALENDAR_FIELD_LABELS[field]}</span>
    </button>
  );
}

export default function CalendarPageView({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
  onDayEdit,
}: CalendarPageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 2 holder - calendar" pageClassName="page--calendar">
      <section className="calendar-page" aria-labelledby="calendar-page-title">
        <div className="calendar-heading">
          <h1 id="calendar-page-title" className={isAdmin ? "admin-calendar-edit-target" : undefined}>
            {content.title}
            {isAdmin ? <CalendarEditButton field="title" onEdit={onEdit} /> : null}
          </h1>
        </div>
        <div className="calendar-prototype-band">
          <CalendarPrototype events={content.events} isAdmin={isAdmin} onAdminDayEdit={onDayEdit} />
          <Link className="calendar-event-inquiry" href={`${basePath}/private-events`}>
            NEED TO INQUIRE ABOUT AN EVENT? <span>CLICK HERE</span>
          </Link>
        </div>
      </section>
    </HolderPage>
  );
}
