import type { BlackbookEntry } from "./blackbookStore";
import type { VenueConfig } from "./venues";

// Sample records shown while the venue runs in preview mode. Only the
// Blackbook still uses these; the ticketing fixtures left with the
// ticketing portal.

const createdAt = "2026-10-01T18:00:00.000Z";

export function previewGuests(venue: VenueConfig): BlackbookEntry[] {
  return [
    { id: 1, name: "Alex Sample", photoUrl: `${venue.basePath}/assets/brand/sample-guest.svg`, notes: "Preview data. Fictional VIP guest.", status: "vip", createdAt, updatedAt: createdAt },
    { id: 2, name: "Taylor Sample", photoUrl: `${venue.basePath}/assets/brand/sample-guest.svg`, notes: "Preview data. Fictional banned-list record for viewing this screen.", status: "banned", createdAt, updatedAt: createdAt },
  ];
}
