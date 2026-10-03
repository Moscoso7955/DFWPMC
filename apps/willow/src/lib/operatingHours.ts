import {
  WEEKDAY_KEYS,
  type CalendarEventContent,
  type DayHours,
  type OperatingHoursContent,
  type WeekdayKey,
} from "./siteContentSchema";

// Sunday-indexed positions in JavaScript's getDay() → our Monday-first
// WEEKDAY_KEYS array. Kept explicit so the mapping is obvious at a
// glance and doesn't depend on the ordering of WEEKDAY_KEYS.
const GET_DAY_TO_KEY: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const HHMM_PATTERN = /^(\d{1,2}):(\d{2})$/;
const FREEFORM_TIME_PATTERN = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i;

function timeToMinutes(hhmm: string): number | null {
  const match = HHMM_PATTERN.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Best-effort parse of the freeform event time strings the admin
// enters ("7 PM", "9:30 pm", "19:30"). Returns null when we can't
// confidently pin down a time — in that case the caller keeps the
// event rather than hide it silently.
export function parseEventMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const twentyFour = HHMM_PATTERN.exec(trimmed);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  const match = FREEFORM_TIME_PATTERN.exec(trimmed);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase().replace(/\./g, "");
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (suffix === "pm" && hours < 12) hours += 12;
  else if (suffix === "am" && hours === 12) hours = 0;

  if (hours < 0 || hours > 23) return null;
  return hours * 60 + minutes;
}

function getWeekdayKey(dateStr: string): WeekdayKey | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return GET_DAY_TO_KEY[date.getDay()];
}

// Does `minutes` fall within [openMinutes, closeMinutes)? closeMinutes
// less than openMinutes means the window crosses midnight — the event
// is valid if it's after opening OR before closing.
function inWindow(minutes: number, openMinutes: number, closeMinutes: number): boolean {
  if (closeMinutes === openMinutes) return false;
  if (closeMinutes > openMinutes) {
    return minutes >= openMinutes && minutes < closeMinutes;
  }
  return minutes >= openMinutes || minutes < closeMinutes;
}

export function isEventWithinHours(
  event: CalendarEventContent,
  hours: OperatingHoursContent,
): boolean {
  const weekdayKey = getWeekdayKey(event.date);
  if (!weekdayKey) return true;

  const day: DayHours | undefined = hours[weekdayKey];
  if (!day) return true;
  if (!day.open) return false;

  const eventMinutes = parseEventMinutes(event.time);
  // Unparseable time: keep the event so a typo doesn't silently hide
  // real programming.
  if (eventMinutes === null) return true;

  const openMinutes = timeToMinutes(day.openTime);
  const closeMinutes = timeToMinutes(day.closeTime);
  if (openMinutes === null || closeMinutes === null) return true;

  return inWindow(eventMinutes, openMinutes, closeMinutes);
}

export function filterEventsByHours(
  events: CalendarEventContent[],
  hours: OperatingHoursContent,
): CalendarEventContent[] {
  return events.filter((event) => isEventWithinHours(event, hours));
}

export { WEEKDAY_KEYS };
