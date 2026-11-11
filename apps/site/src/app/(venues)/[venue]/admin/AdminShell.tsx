import Link from "next/link";
import type { ReactNode } from "react";
import { venuePathFor, type VenueConfig } from "@/lib/venues";
import AdminToolbar from "./AdminToolbar";
import AdminHomePages from "./AdminHomePages";
import VersionBadge from "@/app/components/VersionBadge";
import { hasUnpublishedChanges } from "@/lib/siteContent";

export default async function AdminShell({ children, venue, homepage = false }: { children: ReactNode; venue: VenueConfig; homepage?: boolean }) {
  const unpublished = await hasUnpublishedChanges(venue);
  const base = venue.basePath;
  return <div className={homepage ? "admin-shell admin-shell--venue-home" : "admin-shell admin-shell--venue-pages"}>
    <header className="venue-admin-header" aria-label={venue.name + " website editor"}>
      <Link className="venue-admin-brand" href={`${base}/admin`}>
        <img src={venuePathFor(venue, venue.logo)} alt={venue.name} />
        <span><strong>{venue.name}</strong><small>Website editor</small></span>
      </Link>
      <nav className="venue-admin-nav" aria-label="Editor navigation">
        <Link href={`${base}/admin/analytics`}>Analytics</Link><Link href="/admin/settings">Settings</Link><AdminHomePages venue={venue} />
      </nav>
      <AdminToolbar unpublished={unpublished} />
    </header>
    {children}<VersionBadge variant="light" venueLabel={venue.name} />
  </div>;
}
