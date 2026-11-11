"use client";
import { useVenue } from "./VenueProvider";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { HomepageContent, HomepageContentField } from "@/lib/siteContentSchema";
import BottomMenu from "./VenueHomeMenu";
import DrawerMenu from "./DrawerMenu";

type HomePageStyle = CSSProperties & {
  "--home-desktop-hero-image": string;
  "--home-desktop-logo": string;
  "--home-mobile-logo": string;
  "--home-mobile-image-one": string;
  "--home-mobile-image-two": string;
};

type SiteHomePageProps = {
  basePath?: string;
  content: HomepageContent;
  instagramHref?: string | null;
  isAdmin?: boolean;
  onEdit?: (field: HomepageContentField) => void;
};

function imageUrl(venuePath: <T>(v: T) => T, value: string) {
  return `url("${venuePath(value)}")`;
}

function AdminEditButton({
  field,
  label,
  onEdit,
}: {
  field: HomepageContentField;
  label: string;
  onEdit?: (field: HomepageContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button className={`admin-edit-hotspot admin-edit-hotspot--${field}`} type="button" onClick={() => onEdit(field)}>
      <span>{label}</span>
    </button>
  );
}

function LogoLink({ href, children, ariaLabel }: { href: string | null; children: ReactNode; ariaLabel: string }) {
  if (!href) return <div className="brand-mark-link brand-mark-link--static">{children}</div>;
  return (
    <a
      className="brand-mark-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export default function SiteHomePage({
  basePath = "",
  content,
  instagramHref = null,
  isAdmin = false,
  onEdit,
}: SiteHomePageProps) {
    const { venue, venuePath } = useVenue();
  const base = basePath ? venuePath(basePath) : venue.basePath;
  const style: HomePageStyle = {
    "--home-desktop-hero-image": imageUrl(venuePath, content.desktopHeroImage),
    "--home-desktop-logo": imageUrl(venuePath, content.desktopLogo),
    "--home-mobile-logo": imageUrl(venuePath, content.mobileLogo),
    "--home-mobile-image-one": imageUrl(venuePath, content.mobileHeroImageOne),
    "--home-mobile-image-two": imageUrl(venuePath, content.mobileHeroImageTwo),
  };

  const logoHref = !isAdmin && instagramHref ? instagramHref : null;

  return (
    <div className={isAdmin ? "site-shell venue-homepage admin-editable-site" : "site-shell venue-homepage"} style={style}>
      <DrawerMenu adaptive basePath={base} hideOnDesktop />
      <Link className="top-event-bar" href={`${base}/private-events`}>
        <span>Book an Event</span>
      </Link>

      <main className="hero" aria-label="Willow homepage">
        <section className="hero-panel hero-panel--full" aria-label="Golden cocktail in the Willow lounge">
          <div className="hero-photo-bleed" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          <LogoLink href={logoHref} ariaLabel="Willow on Instagram">
            <div className="brand-mark" role="img" aria-label="Willow Cocktail Bar and Lounge" />
          </LogoLink>
          <AdminEditButton field="desktopHeroImage" label="Edit Hero Images" onEdit={onEdit} />
          <AdminEditButton field="desktopLogo" label="Edit Homepage Logo" onEdit={onEdit} />
        </section>
      </main>

      <BottomMenu basePath={base} />
    </div>
  );
}
