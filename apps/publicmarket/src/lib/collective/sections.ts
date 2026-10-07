// Section registry driving the unified admin's generic editors.
// Field names must match the venue SiteContent schema exactly
// (lib/collective/schema.ts) — the venue sites read these documents.

export type FieldKind = "text" | "textarea" | "image" | "embed";

export type SectionField = {
  name: string;
  label: string;
  kind: FieldKind;
  help?: string;
};

export type SectionDef = {
  slug: string;
  /** Key in the SiteContent document */
  contentKey: string;
  title: string;
  description: string;
  /** Public path (venue-relative) this section renders on */
  publicPath: string;
  fields: SectionField[];
};

export const SECTIONS: SectionDef[] = [
  {
    slug: "homepage",
    contentKey: "homepage",
    title: "Homepage",
    description: "Hero imagery and logo shown on the venue homepage.",
    publicPath: "/",
    fields: [
      { name: "desktopHeroImage", label: "Hero image (desktop)", kind: "image" },
      { name: "mobileHeroImageOne", label: "Hero image (mobile, first)", kind: "image" },
      { name: "mobileHeroImageTwo", label: "Hero image (mobile, second)", kind: "image" },
      { name: "desktopLogo", label: "Logo (desktop)", kind: "image" },
      { name: "mobileLogo", label: "Logo (mobile)", kind: "image" },
    ],
  },
  {
    slug: "menu",
    contentKey: "menu",
    title: "Menu",
    description: "Menu page title and the menu image.",
    publicPath: "/menu",
    fields: [
      { name: "title", label: "Menu title", kind: "text" },
      { name: "image", label: "Menu image", kind: "image" },
    ],
  },
  {
    slug: "story",
    contentKey: "story",
    title: "Story",
    description: "Story copy and the six story photographs.",
    publicPath: "/story",
    fields: [
      { name: "copy", label: "Story copy", kind: "textarea" },
      { name: "imageShadow", label: "Story image 1", kind: "image" },
      { name: "imageNapkin", label: "Story image 2", kind: "image" },
      { name: "imageBar", label: "Story image 3", kind: "image" },
      { name: "imageLetter", label: "Story image 4", kind: "image" },
      { name: "imageCards", label: "Story image 5", kind: "image" },
      { name: "imagePhotoBooth", label: "Story image 6", kind: "image" },
    ],
  },
  {
    slug: "contact",
    contentKey: "contact",
    title: "Contact",
    description: "Contact page details and Instagram link.",
    publicPath: "/contact",
    fields: [
      { name: "title", label: "Contact title", kind: "text" },
      { name: "email", label: "Email", kind: "text" },
      { name: "phone", label: "Phone", kind: "text" },
      { name: "instagram", label: "Instagram URL", kind: "text" },
      { name: "instagramLabel", label: "Instagram name", kind: "text" },
    ],
  },
  {
    slug: "reservations",
    contentKey: "reservations",
    title: "Reservations",
    description: "Reservations page title and booking embed (Tock).",
    publicPath: "/reservations",
    fields: [
      { name: "title", label: "Reservations title", kind: "text" },
      {
        name: "embedCode",
        label: "Booking embed code",
        kind: "embed",
        help: "Paste the provider's embed snippet. It runs on the public page exactly as entered.",
      },
    ],
  },
  {
    slug: "private-events",
    contentKey: "privateEvents",
    title: "Private Events",
    description: "Private events page title and inquiry embed (Tipsy).",
    publicPath: "/private-events",
    fields: [
      { name: "title", label: "Private events title", kind: "text" },
      {
        name: "embedCode",
        label: "Inquiry embed code",
        kind: "embed",
        help: "Paste the provider's embed snippet. It runs on the public page exactly as entered.",
      },
    ],
  },
  {
    slug: "careers",
    contentKey: "careers",
    title: "Careers",
    description: "Careers page title and application embed.",
    publicPath: "/careers",
    fields: [
      { name: "title", label: "Careers title", kind: "text" },
      {
        name: "embedCode",
        label: "Application embed code",
        kind: "embed",
        help: "Paste the provider's embed snippet. It runs on the public page exactly as entered.",
      },
    ],
  },
];

export function getSection(slug: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

export function getSectionField(section: SectionDef, name: string): SectionField | undefined {
  return section.fields.find((f) => f.name === name);
}

/** Sections that still live in the venue portals until they're ported. */
export const VENUE_PORTAL_SECTIONS = [
  { title: "Calendar & events", venuePath: "/admin/calendar" },
  { title: "Operating hours", venuePath: "/admin/hours" },
  { title: "Analytics", venuePath: "/admin/analytics" },
  { title: "Submissions inbox", venuePath: "/admin/submissions" },
  { title: "Mailing list", venuePath: "/admin/mailing-list" },
  { title: "Ticketing portal", venuePath: "/ticketing" },
  { title: "Blackbook", venuePath: "/blackbook" },
];
