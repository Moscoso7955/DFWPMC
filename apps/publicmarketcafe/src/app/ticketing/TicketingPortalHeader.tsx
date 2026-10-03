"use client";
import { appPath, venue, venuePath } from "@/lib/venue";
import Link from "next/link";
import { usePathname } from "next/navigation";
type Props = {
    role: "manager" | "door";
};
const managerNav = [
    { href: "/admin", label: "Website" },
    { href: "/ticketing", label: "Events" },
    { href: "/ticketing/settings", label: "Settings" },
    { href: "/ticketing/qbo-connect", label: "QBO" },
];
export default function TicketingPortalHeader({ role }: Props) {
    const pathname = appPath(usePathname());
    const logOut = async () => {
        await fetch(venuePath("/ticketing/api/logout"), { method: "POST" });
        window.location.href = venuePath("/ticketing/login");
    };
    const nav = role === "manager" ? managerNav : [];
    return (<header className="ticketing-portal-header">
      <Link href="/ticketing" className="ticketing-portal-brand" aria-label="Public Market Cafe & Goods Ticketing">
        <span className="ticketing-portal-brand-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={venuePath("/assets/brand/venue-logo.svg")} alt=""/>
        </span>
        <span className="ticketing-portal-brand-name">{venue.name}<br />Ticketing</span>
      </Link>
      <nav className="ticketing-portal-nav" aria-label="Portal sections">
        {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/ticketing" && pathname?.startsWith(item.href));
            return (<Link key={item.href} href={item.href} className={active ? "ticketing-portal-nav-link ticketing-portal-nav-link--active" : "ticketing-portal-nav-link"}>
              {item.label}
            </Link>);
        })}
      </nav>
      <div className="ticketing-portal-header-actions">
        <span className="ticketing-portal-role">{role === "manager" ? "Manager" : "Door"}</span>
        <button type="button" className="ticketing-portal-logout" onClick={logOut}>
          Log Out
        </button>
      </div>
    </header>);
}
