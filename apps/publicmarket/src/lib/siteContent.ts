import {
  CALENDAR_CONTENT_FIELDS,
  CAREERS_CONTENT_FIELDS,
  CONTACT_CONTENT_FIELDS,
  HOMEPAGE_CONTENT_FIELDS,
  PRIVATE_EVENTS_CONTENT_FIELDS,
  RESERVATIONS_CONTENT_FIELDS,
  type CalendarContentField,
  type CalendarEventContent,
  type CareersContentField,
  type ContactContentField,
  type HomepageContentField,
  type MenuContentField,
  type PrivateEventsContentField,
  type ReservationsContentField,
  STORY_IMAGE_FIELDS,
  type StoryImageField,
  type StoryContentField,
} from "./siteContentSchema";
import { copySiteContent, readSiteContent, writeSiteContent } from "./siteContentStore";

export async function getPublishedSiteContent() {
  return readSiteContent("published");
}

export async function getDraftSiteContent() {
  return readSiteContent("draft");
}

export async function updateDraftHomepageField(field: HomepageContentField, value: string) {
  const content = await getDraftSiteContent();

  if (field === "desktopHeroImage" || field === "mobileHeroImageOne") {
    content.homepage.desktopHeroImage = value;
    content.homepage.mobileHeroImageOne = value;
  } else if (field === "desktopLogo" || field === "mobileLogo") {
    content.homepage.desktopLogo = value;
    content.homepage.mobileLogo = value;
  } else {
    content.homepage[field] = value;
  }

  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftMenuField(field: MenuContentField, value: string) {
  const content = await getDraftSiteContent();
  content.menu[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftStoryField(field: StoryContentField, value: string) {
  const content = await getDraftSiteContent();
  content.story[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftContactField(field: ContactContentField, value: string) {
  const content = await getDraftSiteContent();
  content.contact[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftPrivateEventsField(field: PrivateEventsContentField, value: string) {
  const content = await getDraftSiteContent();
  content.privateEvents[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftCareersField(field: CareersContentField, value: string) {
  const content = await getDraftSiteContent();
  content.careers[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftReservationsField(field: ReservationsContentField, value: string) {
  const content = await getDraftSiteContent();
  content.reservations[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function updateDraftCalendarField(field: CalendarContentField, value: string) {
  const content = await getDraftSiteContent();
  content.calendar[field] = value;
  await writeSiteContent("draft", content);
  return content;
}

export async function addDraftCalendarEvent(event: CalendarEventContent) {
  const content = await getDraftSiteContent();
  content.calendar.events = [...content.calendar.events, event];
  await writeSiteContent("draft", content);
  return content;
}

export async function deleteDraftCalendarEvent(eventId: string) {
  const content = await getDraftSiteContent();
  content.calendar.events = content.calendar.events.filter((event) => event.id !== eventId);
  await writeSiteContent("draft", content);
  return content;
}

export async function moveDraftCalendarEvent(eventId: string, date: string, time: string) {
  const content = await getDraftSiteContent();
  content.calendar.events = content.calendar.events.map((event) =>
    event.id === eventId ? { ...event, date, time } : event,
  );
  await writeSiteContent("draft", content);
  return content;
}

export async function publishDraftContent() {
  await copySiteContent("draft", "published");
  return getPublishedSiteContent();
}

export async function discardDraftContent() {
  await copySiteContent("published", "draft");
  return getDraftSiteContent();
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
