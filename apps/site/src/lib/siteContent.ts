import {
  CALENDAR_CONTENT_FIELDS,
  CAREERS_CONTENT_FIELDS,
  CONTACT_CONTENT_FIELDS,
  HOMEPAGE_CONTENT_FIELDS,
  PRIVATE_EVENTS_CONTENT_FIELDS,
  RESERVATIONS_CONTENT_FIELDS,
  WEEKDAY_KEYS,
  type CalendarContentField,
  type CalendarEventContent,
  type CareersContentField,
  type ContactContentField,
  type DayHours,
  type HomepageContentField,
  type MenuContentField,
  type OperatingHoursContent,
  type PrivateEventsContentField,
  type ReservationsContentField,
  STORY_IMAGE_FIELDS,
  type StoryImageField,
  type StoryContentField,
} from "./siteContentSchema";
import { copySiteContent, readSiteContent, writeSiteContent } from "./siteContentStore";
import type { VenueConfig } from "./venues";

export async function getPublishedSiteContent(venue: VenueConfig) {
  return readSiteContent(venue, "published");
}

export async function getDraftSiteContent(venue: VenueConfig) {
  return readSiteContent(venue, "draft");
}

export async function updateDraftHomepageField(venue: VenueConfig, field: HomepageContentField, value: string) {
  const content = await getDraftSiteContent(venue);

  if (field === "desktopHeroImage" || field === "mobileHeroImageOne") {
    content.homepage.desktopHeroImage = value;
    content.homepage.mobileHeroImageOne = value;
  } else if (field === "desktopLogo" || field === "mobileLogo") {
    content.homepage.desktopLogo = value;
    content.homepage.mobileLogo = value;
  } else {
    content.homepage[field] = value;
  }

  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftMenuField(venue: VenueConfig, field: MenuContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.menu[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftStoryField(venue: VenueConfig, field: StoryContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.story[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftContactField(venue: VenueConfig, field: ContactContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.contact[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftPrivateEventsField(venue: VenueConfig, field: PrivateEventsContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.privateEvents[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftCareersField(venue: VenueConfig, field: CareersContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.careers[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftReservationsField(venue: VenueConfig, field: ReservationsContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.reservations[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function isValidDayHours(value: unknown): value is DayHours {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DayHours>;
  return (
    typeof candidate.open === "boolean" &&
    typeof candidate.openTime === "string" &&
    TIME_PATTERN.test(candidate.openTime) &&
    typeof candidate.closeTime === "string" &&
    TIME_PATTERN.test(candidate.closeTime)
  );
}

export function isValidOperatingHours(value: unknown): value is OperatingHoursContent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return WEEKDAY_KEYS.every((key) => isValidDayHours(record[key]));
}

export async function updateDraftOperatingHours(venue: VenueConfig, hours: OperatingHoursContent) {
  const content = await getDraftSiteContent(venue);
  content.operatingHours = hours;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function updateDraftCalendarField(venue: VenueConfig, field: CalendarContentField, value: string) {
  const content = await getDraftSiteContent(venue);
  content.calendar[field] = value;
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function addDraftCalendarEvent(venue: VenueConfig, event: CalendarEventContent) {
  const content = await getDraftSiteContent(venue);
  content.calendar.events = [...content.calendar.events, event];
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function deleteDraftCalendarEvent(venue: VenueConfig, eventId: string) {
  const content = await getDraftSiteContent(venue);
  content.calendar.events = content.calendar.events.filter((event) => event.id !== eventId);
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function moveDraftCalendarEvent(venue: VenueConfig, eventId: string, date: string, time: string) {
  const content = await getDraftSiteContent(venue);
  content.calendar.events = content.calendar.events.map((event) =>
    event.id === eventId ? { ...event, date, time } : event,
  );
  await writeSiteContent(venue, "draft", content);
  return content;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** True when the admin draft differs from what the live site shows. */
export async function hasUnpublishedChanges(venue: VenueConfig) {
  try {
    const [draft, published] = await Promise.all([getDraftSiteContent(venue), getPublishedSiteContent(venue)]);
    return stableJson(draft) !== stableJson(published);
  } catch {
    return false;
  }
}

export type CalendarDayStatus = "open" | "closed" | "default";

export async function setDraftCalendarDayStatus(venue: VenueConfig, date: string, status: CalendarDayStatus) {
  const content = await getDraftSiteContent(venue);
  const closed = new Set(content.calendar.closedDates ?? []);
  const open = new Set(content.calendar.openDates ?? []);
  closed.delete(date);
  open.delete(date);
  if (status === "closed") closed.add(date);
  if (status === "open") open.add(date);
  content.calendar.closedDates = [...closed].sort();
  content.calendar.openDates = [...open].sort();
  await writeSiteContent(venue, "draft", content);
  return content;
}

export async function publishDraftContent(venue: VenueConfig) {
  await copySiteContent(venue, "draft", "published");
  return getPublishedSiteContent(venue);
}

export async function discardDraftContent(venue: VenueConfig) {
  await copySiteContent(venue, "published", "draft");
  return getDraftSiteContent(venue);
}

export function isHomepageContentField(value: unknown): value is HomepageContentField {
  return typeof value === "string" && HOMEPAGE_CONTENT_FIELDS.includes(value as HomepageContentField);
}

export function isMenuContentField(value: unknown): value is MenuContentField {
  return value === "image" || value === "title";
}

export function isStoryContentField(value: unknown): value is StoryContentField {
  return value === "copy" || (typeof value === "string" && STORY_IMAGE_FIELDS.includes(value as StoryImageField));
}

export function isContactContentField(value: unknown): value is ContactContentField {
  return typeof value === "string" && CONTACT_CONTENT_FIELDS.includes(value as ContactContentField);
}

export function isPrivateEventsContentField(value: unknown): value is PrivateEventsContentField {
  return typeof value === "string" && PRIVATE_EVENTS_CONTENT_FIELDS.includes(value as PrivateEventsContentField);
}

export function isCareersContentField(value: unknown): value is CareersContentField {
  return typeof value === "string" && CAREERS_CONTENT_FIELDS.includes(value as CareersContentField);
}

export function isReservationsContentField(value: unknown): value is ReservationsContentField {
  return typeof value === "string" && RESERVATIONS_CONTENT_FIELDS.includes(value as ReservationsContentField);
}

export function isCalendarContentField(value: unknown): value is CalendarContentField {
  return typeof value === "string" && CALENDAR_CONTENT_FIELDS.includes(value as CalendarContentField);
}
