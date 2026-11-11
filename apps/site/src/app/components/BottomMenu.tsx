"use client";
import { useVenue } from "./VenueProvider";
import Link from "next/link";
import LegalLinks from "./LegalLinks";
import type { MenuClickTarget } from "@/lib/menuClicksStore";
type BottomMenuProps = {
    basePath?: string;
    source?: string;
};
function getHref(basePath: string, href: string) {
    return `${basePath}${href}`;
}
function trackClick(trackUrl: string, target: MenuClickTarget, source: string) {
    if (typeof window === "undefined")
        return;
    const payload = JSON.stringify({ target, source });
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(trackUrl, blob);
            return;
        }
        fetch(trackUrl, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => { });
    }
    catch {
        // Never let tracking failures block navigation.
    }
}
type Item = {
    label: string;
    href: string;
    target: MenuClickTarget;
};
const ROWS: Item[][] = [
    [
        { label: "Menu", href: "/menu", target: "menu" },
        { label: "Calendar", href: "/calendar", target: "calendar" },
    ],
    [
        { label: "BOOK AN EVENT", href: "/private-events", target: "private-events" },
        { label: "Reservations", href: "/reservations", target: "reservations" },
    ],
    [
        { label: "Story", href: "/story", target: "story" },
        { label: "Visit", href: "/visit", target: "visit" },
    ],
    [
        { label: "Contact", href: "/contact", target: "contact" },
        { label: "Careers", href: "/careers", target: "careers" },
    ],
];
export default function BottomMenu({ basePath = "", source = "bottom" }: BottomMenuProps) {
    const { venue, venuePath } = useVenue();
    const base = basePath ? venuePath(basePath) : venue.basePath;
    const skipTracking = base.includes("/admin");
    return (<nav className="bottom-menu" aria-label="Primary">
      {ROWS.map((row, index) => (<div className="menu-row" key={index}>
          {row.map((item) => (<Link key={item.href} href={getHref(base, item.href)} onClick={() => {
                    if (skipTracking)
                        return;
                    trackClick(venuePath("/api/track-click"), item.target, source);
                }}>
              {item.label}
            </Link>))}
        </div>))}
      <LegalLinks className="legal-links legal-links--home"/>
    </nav>);
}
