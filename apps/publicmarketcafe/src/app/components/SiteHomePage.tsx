"use client";

import Link from "next/link";
import { venuePath } from "@/lib/venue";
import type { CSSProperties, ReactNode } from "react";
import type { HomepageContent, HomepageContentField } from "@/lib/siteContentSchema";
import BottomMenu from "./VenueHomeMenu";

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

function imageUrl(value: string) {
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
  const style: HomePageStyle = {
    "--home-desktop-hero-image": imageUrl(content.desktopHeroImage),
    "--home-desktop-logo": imageUrl(content.desktopLogo),
    "--home-mobile-logo": imageUrl(content.mobileLogo),
    "--home-mobile-image-one": imageUrl(content.mobileHeroImageOne),
    "--home-mobile-image-two": imageUrl(content.mobileHeroImageTwo),
  };

  const logoHref = !isAdmin && instagramHref ? instagramHref : null;

  return (
    <div className={isAdmin ? "site-shell venue-homepage admin-editable-site" : "site-shell venue-homepage"} style={style}>
      <Link className="homepage-event-bar" href={`${basePath}/private-events`}>
        BOOK AN EVENT
      </Link>

      <main className="hero" aria-label="Public Market Cafe and Goods homepage">
        <section className="hero-panel hero-panel--full" aria-label="Cafe lounge">
          <div className="hero-photo-bleed" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          <LogoLink href={logoHref} ariaLabel="Public Market Cafe and Goods on Instagram">
            <div className="brand-mark" role="img" aria-label="Public Market Cafe and Goods" />
          </LogoLink>
          <AdminEditButton field="desktopHeroImage" label="Edit Hero Images" onEdit={onEdit} />
          <AdminEditButton field="desktopLogo" label="Edit Homepage Logo" onEdit={onEdit} />
        </section>
      </main>

      <BottomMenu basePath={basePath} />
    </div>
  );
}
