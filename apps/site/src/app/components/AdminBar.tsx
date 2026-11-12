"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// The one admin bar, on every admin page: a slim strip across the top.
// Wide screens show the main sections inline; everything else (and, on
// phones, everything) is in the Menu panel, grouped, with the version,
// who's signed in, Discard and Log out at the bottom. Publish shows only
// on a venue's site-editing pages.
//
// The same bar serves the collective tools (no venue) and each venue's
// website editor (venue set): venue pages get that venue's Website and
// Guests sections and publish against that venue's content store, while
// the collective sections (Nights, Reports, Settings) are market-wide.

type Item = { href: string; label: string; area: string; exact?: boolean; hideIf?: string };
type Group = { title: string; items: Item[] };

export type AdminBarVenue = { name: string; basePath: string };

/** The other venues' editors, so every admin page can reach every site. */
const VENUE_LINKS: AdminBarVenue[] = [
  { name: "Willow", basePath: "/willow" },
  { name: "Madrone", basePath: "/madrone" },
  { name: "PM Cafe", basePath: "/publicmarketcafe" },
];

const NIGHTS: Group = {
  title: "Nights",
  items: [
    { href: "/blackbook", label: "Blackbook", area: "door" },
    { href: "/admin/photos", label: "Photos", area: "photo_review" },
    { href: "/admin/photos/events", label: "Photo events", area: "photo_events" },
    { href: "/upload", label: "Upload photos", area: "photo_upload", hideIf: "photo_review" },
    { href: "/admin/playbook", label: "Playbook", area: "playbook" },
    { href: "/admin/contacts", label: "Vendor contacts", area: "contacts" },
  ],
};

const SETTINGS: Group = {
  title: "Settings",
  items: [
    { href: "/admin/settings", label: "People", area: "people", exact: true },
    { href: "/admin/settings/access", label: "Roles & access", area: "people" },
  ],
};

function buildGroups(venue: AdminBarVenue | null): Group[] {
  if (!venue) {
    return [
      {
        title: "Venues",
        items: VENUE_LINKS.map((v) => ({ href: `${v.basePath}/admin`, label: `${v.name} site`, area: "site" })),
      },
      NIGHTS,
      {
        title: "Reports",
        items: [{ href: "/admin/analytics", label: "Analytics", area: "reports" }],
      },
      SETTINGS,
    ];
  }
  const base = venue.basePath;
  return [
    {
      title: "Website",
      items: [
        { href: `${base}/admin`, label: "Home page", area: "site", exact: true },
        { href: `${base}/admin/menu`, label: "Menu", area: "site" },
        { href: `${base}/admin/calendar`, label: "Calendar", area: "calendar" },
        { href: `${base}/admin/hours`, label: "Operating hours", area: "calendar" },
        { href: `${base}/admin/story`, label: "Story", area: "site" },
        { href: `${base}/admin/visit`, label: "Visit", area: "site" },
        { href: `${base}/admin/contact`, label: "Contact", area: "site" },
        { href: `${base}/admin/careers`, label: "Careers", area: "site" },
        { href: `${base}/admin/private-events`, label: "Book an event", area: "site" },
        { href: `${base}/admin/reservations`, label: "Reservations", area: "site" },
      ],
    },
    NIGHTS,
    {
      title: "Guests",
      items: [
        { href: `${base}/admin/mailing-list`, label: "Mailing list", area: "customers" },
        { href: `${base}/admin/submissions`, label: "Form submissions", area: "customers" },
      ],
    },
    {
      title: "Reports",
      items: [
        { href: "/admin/analytics", label: "Market analytics", area: "reports" },
        { href: `${base}/admin/analytics`, label: `${venue.name} analytics`, area: "reports" },
      ],
    },
    SETTINGS,
    {
      title: "Other venues",
      items: VENUE_LINKS.filter((v) => v.basePath !== base).map((v) => ({
        href: `${v.basePath}/admin`,
        label: `${v.name} site`,
        area: "site",
      })),
    },
  ];
}

/** The sections shown inline on wide screens, and their short labels. */
function buildInline(venue: AdminBarVenue | null): { hrefs: string[]; labels: Record<string, string> } {
  if (!venue) {
    return {
      hrefs: [...VENUE_LINKS.map((v) => `${v.basePath}/admin`), "/admin/photos", "/admin/playbook", "/admin/contacts", "/admin/analytics", "/admin/settings"],
      labels: Object.fromEntries([
        ...VENUE_LINKS.map((v) => [`${v.basePath}/admin`, v.name]),
        ["/admin/contacts", "Vendors"],
        ["/admin/settings", "Settings"],
      ]),
    };
  }
  const base = venue.basePath;
  return {
    hrefs: [`${base}/admin`, "/admin/photos", "/admin/playbook", "/admin/contacts", `${base}/admin/hours`, "/admin/analytics", "/admin/settings"],
    labels: {
      [`${base}/admin`]: "Site",
      [`${base}/admin/hours`]: "Hours",
      "/admin/contacts": "Vendors",
      "/admin/analytics": "Analytics",
      "/admin/settings": "Settings",
    },
  };
}

type Props = {
  areas: string[];
  who: string | null;
  version: string;
  /** Set on a venue's admin pages; the bar publishes against this venue. */
  venue?: AdminBarVenue | null;
  /** Site-editing pages: show Publish, and Discard in the menu. */
  editing: boolean;
  unpublished: boolean;
  /** Page-specific links, e.g. "Set operating hours" on the calendar. */
  shortcuts?: { href: string; label: string }[];
};

export default function AdminBar({ areas, who, version, venue = null, editing, unpublished: initialUnpublished, shortcuts = [] }: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [unpublished, setUnpublished] = useState(initialUnpublished);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const has = (area: string) => areas.includes(area);
  const apiBase = venue ? venue.basePath : "";

  const groups = buildGroups(venue).map((g) => ({ ...g, items: g.items.filter((i) => has(i.area) && !(i.hideIf && has(i.hideIf))) })).filter((g) => g.items.length);
  const all = groups.flatMap((g) => g.items);
  // The page you're on: the longest matching section.
  const current = all
    .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const isCurrent = (i: Item) => current?.href === i.href;
  const { hrefs: inlineHrefs, labels: inlineLabels } = buildInline(venue);
  const inline = inlineHrefs.map((href) => all.find((i) => i.href === href)).filter((i): i is Item => Boolean(i));
  // Inline links stand for their whole group: Site for any website page, Photos for photo events, and so on.
  const groupOf = (href?: string) => groups.find((g) => g.items.some((i) => i.href === href))?.title;
  const inlineCurrent = (i: Item) => {
    if (!current) return false;
    if (venue && i.href === `${venue.basePath}/admin`) return groupOf(current.href) === "Website" && current.href !== `${venue.basePath}/admin/hours`;
    if (!venue && i.href.endsWith("/admin")) return current.href.startsWith(`${i.href.slice(0, -"/admin".length)}/`);
    if (i.href === "/admin/photos") return current.href.startsWith("/admin/photos");
    if (i.href === "/admin/analytics") return groupOf(current.href) === "Reports";
    if (i.href === "/admin/settings") return groupOf(current.href) === "Settings";
    return isCurrent(i);
  };

  // Most edits save without a page load, so re-check now and then.
  useEffect(() => {
    if (!editing) return;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${apiBase}/admin/api/publish-status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { unpublished?: boolean };
        if (!stopped) setUnpublished(Boolean(data.unpublished));
      } catch {}
    };
    const timer = window.setInterval(check, 6000);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [editing, apiBase]);

  // Menu: Escape and outside clicks close it; focus goes in, and back out.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const post = async (url: string) => {
    setBusy(true);
    try {
      await fetch(url, { method: "POST" });
    } finally {
      window.location.reload();
    }
  };
  const discard = () => {
    if (window.confirm("Discard all unpublished changes to this venue's website? This puts the site editor back to what's live now.")) void post(`${apiBase}/admin/api/discard`);
  };
  const logOut = async () => {
    await fetch("/admin/api/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <header className={`admin-bar${editing ? " admin-bar--editing" : ""}${inline.some(inlineCurrent) ? "" : " admin-bar--named"}`}>
      <a className="admin-bar-brand" href="/admin">
        {venue ? venue.name : "Admin"}
      </a>
      <span className="admin-bar-page" aria-hidden="true">
        {current?.label ?? ""}
      </span>

      <nav className="admin-bar-links" aria-label="Admin sections">
        {inline.map((i) => (
          <a key={i.href} href={i.href} aria-current={inlineCurrent(i) ? "page" : undefined}>
            {inlineLabels[i.href] ?? i.label}
          </a>
        ))}
      </nav>

      <span className="admin-bar-spacer" />

      {shortcuts.map((s) => (
        <a key={s.href} className="admin-bar-shortcut" href={s.href}>
          {s.label}
        </a>
      ))}

      {editing ? (
        <button
          type="button"
          className={`admin-bar-publish${unpublished ? " is-pending" : ""}`}
          disabled={busy || !unpublished}
          onClick={() => void post(`${apiBase}/admin/api/publish`)}
        >
          {unpublished ? "Publish changes" : "All live"}
        </button>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className="admin-bar-menu-button"
        aria-expanded={open}
        aria-controls="admin-bar-menu"
        onClick={() => setOpen((o) => !o)}
      >
        Menu <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="admin-bar-menu" id="admin-bar-menu" ref={menuRef}>
          {shortcuts.length ? (
            <section>
              <h2>On this page</h2>
              {shortcuts.map((s) => (
                <a key={s.href} href={s.href}>
                  {s.label}
                </a>
              ))}
            </section>
          ) : null}
          {groups.map((g) => (
            <section key={g.title}>
              <h2>{g.title}</h2>
              {g.items.map((i) => (
                <a key={i.href} href={i.href} aria-current={isCurrent(i) ? "page" : undefined}>
                  {i.label}
                </a>
              ))}
            </section>
          ))}
          <section className="admin-bar-menu-foot">
            {editing ? (
              <button type="button" className="admin-bar-discard" onClick={discard} disabled={busy || !unpublished}>
                Discard unpublished changes
              </button>
            ) : null}
            <button type="button" onClick={logOut}>
              Log out
            </button>
            <p>
              {who ? `Signed in as ${who}` : "Signed in"} · {version}
            </p>
          </section>
        </div>
      ) : null}
    </header>
  );
}
