import type { ReactNode } from "react";
import AdminBar from "@/app/components/AdminBar";
import AdminModalKeys from "@/app/components/AdminModalKeys";
import AdminTips from "@/app/components/AdminTips";
import SaveNote from "@/app/components/SaveNote";
import { formatVersionLabel, getAppVersion } from "@/lib/appVersion";
import { hasUnpublishedChanges } from "@/lib/siteContent";
import { getPrincipal } from "@/lib/session";
import type { VenueConfig } from "@/lib/venues";

type AdminShellProps = {
  children: ReactNode;
  venue: VenueConfig;
  // "tool" pages (Analytics, Mailing list…) are plain admin screens;
  // "preview" pages render the live site with admin edit spots on top.
  layout?: "preview" | "tool";
  /** Page-specific links shown in the admin bar, e.g. "Set operating hours". */
  shortcuts?: { href: string; label: string }[];
};

export default async function AdminShell({ children, venue, layout = "preview", shortcuts }: AdminShellProps) {
  const principal = await getPrincipal();
  const areas = principal ? [...principal.areas] : [];
  const editing = layout === "preview" && areas.includes("site");
  const unpublished = editing ? await hasUnpublishedChanges(venue) : false;
  const who = principal?.kind === "user" ? principal.user.name : null;
  const bar = (
    <AdminBar
      areas={areas}
      who={who}
      version={formatVersionLabel(getAppVersion())}
      venue={{ name: venue.name, basePath: venue.basePath }}
      editing={editing}
      unpublished={unpublished}
      shortcuts={shortcuts}
    />
  );

  if (layout === "tool") {
    return (
      <div className="admin-shell admin-shell--tool">
        {bar}
        <AdminModalKeys />
        <AdminTips />
        <SaveNote />
        {children}
      </div>
    );
  }

  // The site preview sits in a frame under the bar. The frame contains the
  // site's own pinned pieces (menu bar, logo, hamburger, pop-ups), so
  // nothing on the site can slide under the admin bar or cover it.
  return (
    <div className="admin-shell admin-shell--preview">
      {bar}
      <AdminModalKeys />
      <AdminTips />
      <div className="admin-site-frame">
        <div className="admin-site-scroll" id="admin-site-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
