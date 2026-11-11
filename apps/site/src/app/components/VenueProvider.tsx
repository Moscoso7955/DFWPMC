"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { venuePathFor, venueSrcSetFor, type VenueConfig } from "@/lib/venues";

// Client components learn which venue skin they're rendering from this
// context, set by the venue root layout. venuePath/venueSrcSet carry the
// same semantics the old per-venue apps had.

type VenueContextValue = {
  venue: VenueConfig;
  venuePath: <T>(value: T) => T;
  venueSrcSet: (value: string | undefined) => string | undefined;
};

const VenueContext = createContext<VenueContextValue | null>(null);

export function VenueProvider({ venue, children }: { venue: VenueConfig; children: ReactNode }) {
  const value = useMemo<VenueContextValue>(
    () => ({
      venue,
      venuePath: (v) => venuePathFor(venue, v),
      venueSrcSet: (v) => venueSrcSetFor(venue, v),
    }),
    [venue],
  );
  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenue(): VenueContextValue {
  const value = useContext(VenueContext);
  if (!value) throw new Error("useVenue must be used inside a venue page");
  return value;
}
