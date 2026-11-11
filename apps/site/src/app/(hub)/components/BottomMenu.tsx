import type { Ref } from "react";
import { brands } from "@/brands";

function VenueCards({ variant = "main" }: { variant?: "main" | "sticky" }) {
  return brands.map((venue) => {
    const useSolidBackground = variant === "sticky";

    return (
      <a
        className={`menu-card venue-card venue-card--${venue.slug}`}
        href={venue.sitePath}
        aria-label={`Open ${venue.publicName}`}
        key={venue.slug}
      >
        {useSolidBackground ? null : (
          <>
            <img className="venue-card-background" src={venue.background} alt="" />
            <span className="venue-card-overlay" aria-hidden="true" />
          </>
        )}
        <img className="venue-card-logo" src={venue.logo} alt="" />
        <h2 className="venue-card-title">{venue.publicName}</h2>
      </a>
    );
  });
}

export default function BottomMenu({ midpointRef }: { midpointRef?: Ref<HTMLSpanElement> }) {
  return (
    <nav className="bottom-menu" aria-label="Local venue projects">
      <VenueCards />
      <span className="venue-menu-midpoint-sentinel" ref={midpointRef} aria-hidden="true" />
    </nav>
  );
}

export function StickyVenueMenu({ isVisible }: { isVisible: boolean }) {
  return (
    <nav
      className={`sticky-venue-menu${isVisible ? " is-visible" : ""}`}
      aria-label="Sticky local venue projects"
      aria-hidden={!isVisible}
    >
      <VenueCards variant="sticky" />
    </nav>
  );
}
