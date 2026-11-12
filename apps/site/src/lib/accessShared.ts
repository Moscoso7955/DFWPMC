// Who can see what: the areas of admin, the built-in roles and what they
// get by default. Shared by server code and the settings screens.
//
// Each venue's copy of the site has its own users and roles. A person can
// have several roles and sees everything any of them allows. Admin always
// has everything and is the venue's ADMIN_EMAIL.

export type AreaId =
  | "site"
  | "calendar"
  | "door"
  | "blackbook"
  | "photo_upload"
  | "photo_review"
  | "photo_events"
  | "playbook"
  | "playbook_budget"
  | "playbook_emails"
  | "contacts"
  | "customers"
  | "reports"
  | "people";

export const AREAS: { id: AreaId; label: string; hint: string; home: string }[] = [
  { id: "site", label: "Site & pages", hint: "Home, menu, story, visit, careers; publish changes", home: "/admin" },
  { id: "calendar", label: "Calendar & hours", hint: "Events, closed days, operating hours", home: "/admin/calendar" },
  { id: "door", label: "Blackbook view", hint: "Look up VIPs and banned guests", home: "/blackbook" },
  { id: "blackbook", label: "Blackbook edits", hint: "Add or change VIP and banned-guest entries", home: "/blackbook" },
  { id: "photo_upload", label: "Photo upload", hint: "Upload a night's photos", home: "/upload" },
  { id: "photo_review", label: "Photo review", hint: "Pass / fail photos, publish nights", home: "/admin/photos" },
  { id: "photo_events", label: "Photo events", hint: "Costume contests and other photo events", home: "/admin/photos/events" },
  { id: "playbook", label: "Playbook", hint: "Plays, tasks, look book, supplies, dates", home: "/admin/playbook" },
  { id: "playbook_budget", label: "Playbook budgets", hint: "See and edit the money in plays", home: "/admin/playbook" },
  { id: "playbook_emails", label: "Playbook emails", hint: "Gets the kickoff and Monday emails", home: "/admin/playbook" },
  { id: "contacts", label: "Contacts", hint: "Vendors and outside help", home: "/admin/contacts" },
  { id: "customers", label: "Customers & mailing list", hint: "Guests, sign-ups, form submissions", home: "/admin/mailing-list" },
  { id: "reports", label: "Reports", hint: "Analytics", home: "/admin/analytics" },
  { id: "people", label: "People & access", hint: "Invite people, roles, this page", home: "/admin/settings" },
];

export const AREA_IDS = AREAS.map((a) => a.id);
export const isArea = (v: unknown): v is AreaId => typeof v === "string" && (AREA_IDS as string[]).includes(v);

export type Role = { id: string; name: string; areas: AreaId[]; builtin: boolean; sort: number };

export const ADMIN_ROLE = "admin";

export const BUILTIN_ROLES: Omit<Role, "sort">[] = [
  { id: ADMIN_ROLE, name: "Admin", areas: AREA_IDS, builtin: true },
  { id: "manager", name: "Manager", areas: AREA_IDS.filter((a) => a !== "people"), builtin: true },
  { id: "staff", name: "Staff", areas: ["playbook", "contacts"], builtin: true },
  { id: "door", name: "Door", areas: ["door"], builtin: true },
  { id: "photographer", name: "Photographer", areas: ["photo_upload"], builtin: true },
];

export type UserStatus = "pending" | "invited" | "active" | "disabled";

export type VenueUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: UserStatus;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
  lastSignInAt: string | null;
  isOwner: boolean;
  /** Gets the morning "new on the site" feature emails. */
  updateEmails: boolean;
};

/** The admin pages and APIs each area covers (longest match wins). */
export const PATH_AREAS: [prefix: string, area: AreaId | "public"][] = [
  ["/admin/login", "public"],
  ["/admin/api/login", "public"],
  ["/admin/api/logout", "public"],
  ["/admin/no-access", "public"],
  ["/admin/settings", "people"],
  ["/admin/api/access", "people"],
  ["/admin/photos/events", "photo_events"],
  ["/admin/api/contests", "photo_events"],
  ["/admin/photos", "photo_review"],
  ["/admin/api/photos", "photo_review"],
  ["/admin/api/photo-alert", "photo_review"],
  ["/admin/playbook", "playbook"],
  ["/admin/api/playbook", "playbook"],
  ["/admin/contacts", "contacts"],
  ["/admin/api/contacts", "contacts"],
  ["/admin/calendar", "calendar"],
  ["/admin/api/calendar", "calendar"],
  ["/admin/hours", "calendar"],
  ["/admin/api/hours", "calendar"],
  ["/admin/mailing-list", "customers"],
  ["/admin/api/mailing-list-export", "customers"],
  ["/admin/api/master-list", "customers"],
  ["/admin/api/opex", "reports"],
  ["/admin/submissions", "customers"],
  ["/admin/analytics", "reports"],
  ["/admin", "site"],
  ["/blackbook", "door"],
  ["/upload", "photo_upload"],
];

export function areaForPath(pathname: string): AreaId | "public" | null {
  let best: [string, AreaId | "public"] | null = null;
  for (const entry of PATH_AREAS) {
    const [prefix] = entry;
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}
