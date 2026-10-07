import Link from "next/link";
import { redirect } from "next/navigation";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { COLLECTIVE_VENUES } from "@/lib/collective/venues";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await hasCollectiveSession())) redirect("/admin/login");

  return (
    <>
      <header className="fwa-topbar">
        <Link className="fwa-topbar-title" href="/admin">
          The Public Market — Admin
        </Link>
        <div className="fwa-topbar-actions">
          <form method="post" action="/admin/api/logout">
            <button className="fwa-btn fwa-btn--ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="fwa-main">
        <h1>Venues</h1>
        <p className="fwa-sub">Choose a venue to edit its website content.</p>
        <div className="fwa-grid">
          {COLLECTIVE_VENUES.map((venue) => (
            <Link key={venue.slug} className="fwa-card" href={`/admin/${venue.slug}`}>
              <p className="fwa-card-title">{venue.name}</p>
              <p className="fwa-card-desc">fwpublicmarket.com{venue.basePath}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
