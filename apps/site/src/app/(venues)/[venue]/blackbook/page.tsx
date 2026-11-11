import { redirect } from "next/navigation";

// The collective keeps one Blackbook; the old per-venue URLs land there.
export default function VenueBlackbookRedirect() {
    redirect("/blackbook");
}
