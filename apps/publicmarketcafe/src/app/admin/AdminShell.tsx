import Link from "next/link";
import type { ReactNode } from "react";
import { venue, venuePath } from "@/lib/venue";
import AdminToolbar from "./AdminToolbar";
import AdminHomePages from "./AdminHomePages";
import VersionBadge from "../components/VersionBadge";
import { hasUnpublishedChanges } from "@/lib/siteContent";

export default async function AdminShell({ children, homepage = false }: { children: ReactNode; homepage?: boolean }) {
  const unpublished = await hasUnpublishedChanges();
  return <div className={homepage ? "admin-shell admin-shell--venue-home" : "admin-shell admin-shell--venue-pages"}>
    <header className="venue-admin-header" aria-label={venue.name + " website editor"}>
      <Link className="venue-admin-brand" href="/admin">
        <img src={venuePath(venue.logo)} alt={venue.name} />
        <span><strong>{venue.name}</strong><small>Website editor</small></span>
      </Link>
      <nav className="venue-admin-nav" aria-label="Editor navigation">
        <Link href="/admin/analytics">Analytics</Link><Link href="/admin/settings">Settings</Link><AdminHomePages />
      </nav>
      <AdminToolbar unpublished={unpublished} />
    </header>
    {children}<VersionBadge variant="light" />
  </div>;
}
