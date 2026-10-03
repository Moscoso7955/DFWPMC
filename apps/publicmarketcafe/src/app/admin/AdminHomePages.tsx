import Link from "next/link";

const pages = [
  ["Homepage", "/admin"], ["Menu", "/admin/menu"],
  ["Calendar", "/admin/calendar"], ["Private Events", "/admin/private-events"],
  ["Reservations", "/admin/reservations"], ["Story", "/admin/story"],
  ["Visit", "/admin/visit"], ["Contact", "/admin/contact"],
  ["Careers", "/admin/careers"], ["Contact Inbox", "/admin/submissions"],
  ["Subscribers", "/admin/mailing-list"], ["Hours", "/admin/hours"],
  ["Ticketing", "/ticketing"], ["Blackbook", "/blackbook"],
];

export default function AdminHomePages() {
  return <details className="admin-home-pages">
    <summary>Pages</summary>
    <nav aria-label="All admin pages">
      {pages.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
    </nav>
  </details>;
}
