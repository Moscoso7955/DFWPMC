export type HomepageContent = {
  desktopHeroImage: string;
  mobileHeroImageOne: string;
  mobileHeroImageTwo: string;
  desktopLogo: string;
  mobileLogo: string;
};

export type MenuContent = {
  image: string;
  title: string;
};

export type StoryContent = {
  copy: string;
  imageBar: string;
  imageCards: string;
  imageLetter: string;
  imageNapkin: string;
  imagePhotoBooth: string;
  imageShadow: string;
};

export type ContactContent = {
  title: string;
  email: string;
  phone: string;
  instagram: string;
  instagramLabel: string;
};

export type PrivateEventsContent = {
  title: string;
  embedCode: string;
};

export type CareersContent = {
  title: string;
  embedCode: string;
};

export type ReservationsContent = {
  title: string;
  embedCode: string;
};

export type CalendarEventContent = {
  id: string;
  date: string;
  title: string;
  time: string;
  description: string;
  url?: string;
};

export type CalendarContent = {
  title: string;
  events: CalendarEventContent[];
};

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// Times are 24-hour "HH:MM" strings matching the value produced by
// <input type="time">. openTime > closeTime is interpreted as a
// window that crosses midnight (e.g. 16:00 → 01:00 for a bar that
// closes at 1 AM the next day).
export type DayHours = {
  open: boolean;
  openTime: string;
  closeTime: string;
};

export type OperatingHoursContent = Record<WeekdayKey, DayHours>;

export type HomepageContentField = keyof HomepageContent;
export type MenuContentField = keyof MenuContent;
export type StoryContentField = keyof StoryContent;
export type StoryImageField = Exclude<StoryContentField, "copy">;
export type ContactContentField = keyof ContactContent;
export type PrivateEventsContentField = keyof PrivateEventsContent;
export type CareersContentField = keyof CareersContent;
export type ReservationsContentField = keyof ReservationsContent;
export type CalendarContentField = keyof Pick<CalendarContent, "title">;

export type SiteContent = {
  homepage: HomepageContent;
  menu: MenuContent;
  story: StoryContent;
  contact: ContactContent;
  privateEvents: PrivateEventsContent;
  careers: CareersContent;
  reservations: ReservationsContent;
  calendar: CalendarContent;
  operatingHours: OperatingHoursContent;
};

export const WEEKDAY_KEYS: WeekdayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const DEFAULT_OPERATING_HOURS: OperatingHoursContent = {
  monday: { open: false, openTime: "09:00", closeTime: "17:00" },
  tuesday: { open: false, openTime: "09:00", closeTime: "17:00" },
  wednesday: { open: false, openTime: "09:00", closeTime: "17:00" },
  thursday: { open: false, openTime: "09:00", closeTime: "17:00" },
  friday: { open: false, openTime: "09:00", closeTime: "17:00" },
  saturday: { open: false, openTime: "09:00", closeTime: "17:00" },
  sunday: { open: false, openTime: "09:00", closeTime: "17:00" },
};

export const HOMEPAGE_CONTENT_FIELDS: HomepageContentField[] = [
  "desktopHeroImage",
  "mobileHeroImageOne",
  "mobileHeroImageTwo",
  "desktopLogo",
  "mobileLogo",
];

export const HOMEPAGE_FIELD_LABELS: Record<HomepageContentField, string> = {
  desktopHeroImage: "Hero Images",
  mobileHeroImageOne: "Hero Images",
  mobileHeroImageTwo: "Hero Images",
  desktopLogo: "Homepage Logo",
  mobileLogo: "Homepage Logo",
};

export const STORY_IMAGE_FIELDS: StoryImageField[] = [
  "imageShadow",
  "imageNapkin",
  "imageBar",
  "imageLetter",
  "imageCards",
  "imagePhotoBooth",
];

export const STORY_FIELD_LABELS: Record<StoryContentField, string> = {
  copy: "Story Copy",
  imageShadow: "Story Image 1",
  imageNapkin: "Story Image 2",
  imageBar: "Story Image 3",
  imageLetter: "Story Image 4",
  imageCards: "Story Image 5",
  imagePhotoBooth: "Story Image 6",
};

export const CONTACT_CONTENT_FIELDS: ContactContentField[] = [
  "title",
  "email",
  "phone",
  "instagram",
  "instagramLabel",
];

export const CONTACT_FIELD_LABELS: Record<ContactContentField, string> = {
  title: "Contact Title",
  email: "Contact Email",
  phone: "Contact Phone",
  instagram: "Instagram Link",
  instagramLabel: "Instagram Name",
};

export const PRIVATE_EVENTS_CONTENT_FIELDS: PrivateEventsContentField[] = ["title", "embedCode"];

export const PRIVATE_EVENTS_FIELD_LABELS: Record<PrivateEventsContentField, string> = {
  title: "Private Events Title",
  embedCode: "Private Events Embed Code",
};

export const CAREERS_CONTENT_FIELDS: CareersContentField[] = ["title", "embedCode"];

export const CAREERS_FIELD_LABELS: Record<CareersContentField, string> = {
  title: "Careers Title",
  embedCode: "Careers Embed Code",
};

export const RESERVATIONS_CONTENT_FIELDS: ReservationsContentField[] = ["title", "embedCode"];

export const RESERVATIONS_FIELD_LABELS: Record<ReservationsContentField, string> = {
  title: "Reservations Title",
  embedCode: "Reservations Embed Code",
};

export const CALENDAR_CONTENT_FIELDS: CalendarContentField[] = ["title"];

export const CALENDAR_FIELD_LABELS: Record<CalendarContentField, string> = {
  title: "Calendar Title",
};
