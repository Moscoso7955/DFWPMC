import { getBlackbookRole } from "@/lib/blackbookAuth";
import { listBlackbookEntries } from "@/lib/blackbookStore";
import { redirect } from "next/navigation";
import BlackbookView from "./BlackbookView";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
export default async function BlackbookPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
    const role = await getBlackbookRole(venue);
    if (!role)
        redirect(`${venue.basePath}/blackbook/login`);
    const entries = await listBlackbookEntries(venue);
    return <BlackbookView initialEntries={entries} canEdit={role === "admin"}/>;
}
