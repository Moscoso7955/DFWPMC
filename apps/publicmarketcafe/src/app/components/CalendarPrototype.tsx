"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import { getCalendarNoteVariant } from "@/lib/sportsSchedule";
import type { CalendarEventContent } from "@/lib/siteContentSchema";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type CalendarCell = {
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    events?: CalendarEventContent[];
};
type CalendarPrototypeProps = {
    events: CalendarEventContent[];
    isAdmin?: boolean;
    onAdminDayEdit?: (date: string) => void;
};
function getMonthKey(date: Date) {
    return date.getFullYear() * 12 + date.getMonth();
}
function getDateKey(date: Date) {
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}
function formatCalendarDate(date: Date) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function todayKey(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}
function getMonthGrid(date: Date, events: CalendarEventContent[]): CalendarCell[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - mondayOffset);
    return Array.from({ length: 35 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        const dayEvents = events.filter((event) => event.date === getDateKey(day));
        return {
            date: day,
            dayNumber: day.getDate(),
            isCurrentMonth: day.getMonth() === month,
            events: dayEvents.length ? dayEvents : undefined,
        };
    });
}
export default function CalendarPrototype({ events, isAdmin = false, onAdminDayEdit }: CalendarPrototypeProps) {
    const baseMonth = (() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    })();
    const [displayedMonth, setDisplayedMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDay, setSelectedDay] = useState<CalendarCell | null>(null);
    const cells = getMonthGrid(displayedMonth, events);
    const monthLabel = displayedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const canGoBack = getMonthKey(displayedMonth) > getMonthKey(baseMonth);
    const showPreviousMonth = () => {
        setDisplayedMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };
    const showNextMonth = () => {
        setDisplayedMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };
    return (<div className="calendar-prototype" aria-label={`${monthLabel} calendar prototype`}>
      <div className="calendar-month">
        {canGoBack ? (<button className="calendar-month-button calendar-month-button--back" type="button" onClick={showPreviousMonth}>
            <span aria-hidden="true">←</span> Back
          </button>) : null}
        <span>{monthLabel}</span>
        <button className="calendar-month-button calendar-month-button--next" type="button" onClick={showNextMonth}>
          Next <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (<div className="calendar-weekday" key={day}>
            {day}
          </div>))}
        {cells.map((cell) => {
            const cellKey = getDateKey(cell.date);
            const isToday = cellKey === todayKey();
            return (<button type="button" className={`${cell.isCurrentMonth ? "calendar-day" : "calendar-day calendar-day--outside"}${isAdmin ? " calendar-day--admin" : ""}${isToday ? " calendar-day--today" : ""}`} key={cell.date.toISOString()} onClick={() => {
                    if (isAdmin && onAdminDayEdit) {
                        onAdminDayEdit(getDateKey(cell.date));
                        return;
                    }
                    setSelectedDay(cell);
                }}>
            {isToday ? <span className="calendar-today-badge" aria-hidden="true">Today</span> : null}
            <span className="calendar-date">{cell.dayNumber}</span>
            {cell.events ? (<span className="calendar-notes">
                {cell.events.map((event) => {
                        const variant = getCalendarNoteVariant(event.id);
                        const className = variant
                            ? `calendar-note calendar-note--${variant}`
                            : "calendar-note";
                        return (<span className={className} key={event.id}>
                      {event.title}
                    </span>);
                    })}
              </span>) : null}
          </button>);
        })}
      </div>
      {selectedDay ? (<div className="calendar-modal" role="dialog" aria-modal="true" aria-label={formatCalendarDate(selectedDay.date)}>
          <div className="calendar-modal-panel">
            <button className="calendar-modal-close" type="button" onClick={() => setSelectedDay(null)}>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Close</span>
            </button>
            <p className="calendar-modal-kicker">Itinerary</p>
            <h2>{formatCalendarDate(selectedDay.date)}</h2>
            {selectedDay.events?.length ? (<div className="calendar-modal-events">
                {selectedDay.events.map((event) => (<article className="calendar-modal-event" key={event.id}>
                    <dl>
                      <div>
                        <dt>Title</dt>
                        <dd>{event.title}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>{formatCalendarDate(selectedDay.date)}</dd>
                      </div>
                      <div>
                        <dt>Time</dt>
                        <dd>{event.time}</dd>
                      </div>
                      <div>
                        <dt>Description</dt>
                        <dd>{event.description}</dd>
                      </div>
                      {event.url ? (<div>
                          <dt>More Info</dt>
                          <dd>
                            <a href={venuePath(event.url)} target="_blank" rel="noreferrer">
                              {event.url}
                            </a>
                          </dd>
                        </div>) : null}
                    </dl>
                  </article>))}
              </div>) : (<p className="calendar-modal-empty">No events scheduled for this date.</p>)}
          </div>
        </div>) : null}
    </div>);
}
