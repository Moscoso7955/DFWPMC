"use client";
import { useVenue } from "./VenueProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LegalLinks from "./LegalLinks";
import type { MenuClickTarget } from "@/lib/menuClicksStore";
type BottomMenuProps = {
    basePath?: string;
    source?: string;
    /** Sub-pages: a full-width "Return Home" row on top of the grid. */
    returnHome?: boolean;
    className?: string;
    showLegalLinks?: boolean;
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
export default function BottomMenu({ basePath = "", source = "bottom", returnHome = false, className, showLegalLinks = true }: BottomMenuProps) {
    const { venue, venuePath } = useVenue();
    const pathname = usePathname() ?? "";
    const here = pathname.replace(/\/+$/, "") || "/";
    const base = basePath ? venuePath(basePath) : venue.basePath;
    const skipTracking = base.includes("/admin");
    return (<nav className={className ? `bottom-menu ${className}` : "bottom-menu"} aria-label="Primary">
      {returnHome ? (<div className="menu-row menu-row--home">
          <Link href={base || "/"}>
            <span aria-hidden="true">←</span> Return Home
          </Link>
        </div>) : null}
      {ROWS.map((row, index) => (<div className="menu-row" key={index}>
          {row.map((item) => (<Link key={item.href} href={getHref(base, item.href)} aria-current={here === getHref(base, item.href) ? "page" : undefined} onClick={() => {
                    if (skipTracking)
                        return;
                    trackClick(venuePath("/api/track-click"), item.target, source);
                }}>
              {item.label}
            </Link>))}
        </div>))}
      {showLegalLinks ? <LegalLinks className="legal-links legal-links--home"/> : null}
    </nav>);
}
