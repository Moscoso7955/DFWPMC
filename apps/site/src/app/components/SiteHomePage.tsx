"use client";
import { useVenue } from "./VenueProvider";

import Link from "next/link";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { HomepageContent, HomepageContentField } from "@/lib/siteContentSchema";
import BottomMenu from "./BottomMenu";
import DrawerMenu from "./DrawerMenu";
import LegalLinks from "./LegalLinks";

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
  const hasHeroEventBar = venue.slug === "madrone" || venue.slug === "publicmarketcafe";

  useEffect(() => {
    if (isAdmin || venue.slug !== "publicmarketcafe") return;

    const previousScrollRestoration = window.history.scrollRestoration;
    let firstFrame = 0;
    let secondFrame = 0;
    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const resetScroll = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      scrollToTop();
      // Finish after navigation and browser history restoration have settled.
      firstFrame = window.requestAnimationFrame(() => {
        scrollToTop();
        secondFrame = window.requestAnimationFrame(scrollToTop);
      });
    };

    window.history.scrollRestoration = "manual";
    resetScroll();
    window.addEventListener("pageshow", resetScroll);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener("pageshow", resetScroll);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [isAdmin, venue.slug]);

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
      {hasHeroEventBar ? null : (
        <Link className="top-event-bar" href={`${base}/private-events`}>
          <span>Book an Event</span>
        </Link>
      )}

      <main className="hero" aria-label={`${venue.name} homepage`}>
        <section className="hero-panel hero-panel--full" aria-label={`${venue.name} dining space`}>
          <div className="hero-photo-bleed" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          {hasHeroEventBar ? (
            <Link className="hero-event-bar" href={`${base}/private-events`}>
              Book an Event
            </Link>
          ) : null}
          <LogoLink href={logoHref} ariaLabel={`${venue.name} on Instagram`}>
            <div className="brand-mark" role="img" aria-label={venue.name} />
          </LogoLink>
          <AdminEditButton field="desktopHeroImage" label="Edit Hero Images" onEdit={onEdit} />
          <AdminEditButton field="desktopLogo" label="Edit Homepage Logo" onEdit={onEdit} />
        </section>
      </main>

      <footer className="home-navigation">
        <BottomMenu basePath={base} showLegalLinks={false} />
        <nav aria-label="Policies">
          <LegalLinks className="home-policy" />
        </nav>
      </footer>
    </div>
  );
}
