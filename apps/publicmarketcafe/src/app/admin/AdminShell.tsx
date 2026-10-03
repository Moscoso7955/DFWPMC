import Link from "next/link";
import type { ReactNode } from "react";
import { venue, venuePath } from "@/lib/venue";
import AdminToolbar from "./AdminToolbar";
import AdminHomePages from "./AdminHomePages";
import VersionBadge from "../components/VersionBadge";

export default function AdminShell({ children, homepage = false }: { children: ReactNode; homepage?: boolean }) {
  return <div className={homepage ? "admin-shell admin-shell--venue-home" : "admin-shell admin-shell--venue-pages"}>
    <header className="venue-admin-header" aria-label={venue.name + " website editor"}>
      <Link className="venue-admin-brand" href="/admin">
        <img src={venuePath(venue.logo)} alt={venue.name} />
        <span><strong>{venue.name}</strong><small>Website editor</small></span>
      </Link>
      <nav className="venue-admin-nav" aria-label="Editor navigation">
        <Link href="/admin/analytics">Analytics</Link><AdminHomePages />
      </nav>
      <AdminToolbar />
    </header>
    {children}<VersionBadge variant="light" />
  </div>;
}
