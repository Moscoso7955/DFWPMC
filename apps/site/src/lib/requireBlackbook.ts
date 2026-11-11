import { redirect } from "next/navigation";
import { hasBlackbookSession } from "./blackbookAuth";
import type { VenueConfig } from "./venues";
export async function requireBlackbookSession(venue: VenueConfig) {
    if (!(await hasBlackbookSession(venue))) {
        redirect(`${venue.basePath}/blackbook/login`);
    }
}
