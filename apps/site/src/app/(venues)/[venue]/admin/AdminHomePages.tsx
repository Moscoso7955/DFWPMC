import Link from "next/link";
import type { VenueConfig } from "@/lib/venues";

const pages = [
  ["Homepage", "/admin"], ["Menu", "/admin/menu"],
  ["Calendar", "/admin/calendar"], ["Private Events", "/admin/private-events"],
  ["Reservations", "/admin/reservations"], ["Story", "/admin/story"],
  ["Visit", "/admin/visit"], ["Contact", "/admin/contact"],
  ["Careers", "/admin/careers"], ["Contact Inbox", "/admin/submissions"],
  ["Subscribers", "/admin/mailing-list"], ["Hours", "/admin/hours"],
  ["Blackbook", "/blackbook"],
];

export default function AdminHomePages({ venue }: { venue: VenueConfig }) {
  return <details className="admin-home-pages">
    <summary>Pages</summary>
    <nav aria-label="All admin pages">
      {pages.map(([label, href]) => <Link key={href} href={`${venue.basePath}${href}`}>{label}</Link>)}
    </nav>
  </details>;
}
