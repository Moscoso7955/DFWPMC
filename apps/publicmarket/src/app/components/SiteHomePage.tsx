"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { HomepageContent, HomepageContentField } from "@/lib/siteContentSchema";
import BottomMenu, { StickyVenueMenu } from "./BottomMenu";
import DrawerMenu from "./DrawerMenu";
import HomepageSections from "./HomepageSections";
import "../homepage-v2.css";

type HomePageStyle = CSSProperties & {
  "--home-desktop-hero-image": string;
  "--home-mobile-image-one": string;
};

type SiteHomePageProps = {
  basePath?: string;
  content: HomepageContent;
  isAdmin?: boolean;
  onEdit?: (field: HomepageContentField) => void;
};

function imageUrl(value: string) {
  return `url("${value}")`;
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

export default function SiteHomePage({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
}: SiteHomePageProps) {
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [showStickyVenueMenu, setShowStickyVenueMenu] = useState(false);
  const venueMenuMidpointRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    let secondFrame = 0;

    const resetScroll = () => window.scrollTo(0, 0);

    window.history.scrollRestoration = "manual";
    resetScroll();

    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      secondFrame = window.requestAnimationFrame(resetScroll);
    });

    window.addEventListener("pageshow", resetScroll);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.removeEventListener("pageshow", resetScroll);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const updateScrolledState = () => {
      setIsPageScrolled(window.scrollY > 0);

      const midpoint = venueMenuMidpointRef.current;
      if (midpoint) setShowStickyVenueMenu(midpoint.getBoundingClientRect().top < 0);
    };

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    const midpoint = venueMenuMidpointRef.current;
    if (!midpoint) return;

    const observer = new IntersectionObserver(([entry]) => {
      setShowStickyVenueMenu(entry.boundingClientRect.top < 0);
    });

    observer.observe(midpoint);
    return () => observer.disconnect();
  }, []);

  const style: HomePageStyle = {
    "--home-desktop-hero-image": imageUrl(content.desktopHeroImage),
    "--home-mobile-image-one": imageUrl(content.mobileHeroImageOne),
  };

  return (
    <div id="page-top" className={isAdmin ? "site-shell pm-home-v2 admin-editable-site" : "site-shell pm-home-v2"} style={style}>
      <a className="pm-skip-link" href="#landmark">Skip to content</a>
      <header className={`public-market-topbar${isPageScrolled ? " is-compact" : ""}`} aria-label="Public Market">
        <DrawerMenu basePath={basePath} inTopbar />
        <img
          className="public-market-topbar-logo"
          src="/assets/brand/pm-seal-green.svg"
          alt="The Public Market, Fort Worth, Texas"
        />
      </header>

      <h1 className="sr-only">Public Market</h1>
      <section className="hero" aria-label="Public Market homepage">
        <section className="hero-panel hero-panel--photo" aria-label="Historic Fort Worth Public Market building">
          <div className="hero-photo-bleed" aria-hidden="true" />
          <AdminEditButton field="desktopHeroImage" label="Edit Hero Images" onEdit={onEdit} />
        </section>
      </section>

      <section className="mobile-hero" aria-label="Public Market mobile homepage">
        <section className="mobile-image-panel mobile-image-panel--one" aria-label="Historic Fort Worth Public Market building">
          <AdminEditButton field="mobileHeroImageOne" label="Edit Hero Images" onEdit={onEdit} />
        </section>
      </section>

      <BottomMenu midpointRef={venueMenuMidpointRef} />
      <StickyVenueMenu isVisible={!isAdmin && showStickyVenueMenu} />

      <main className="pm-home-content"><HomepageSections /></main>
    </div>
  );
}
