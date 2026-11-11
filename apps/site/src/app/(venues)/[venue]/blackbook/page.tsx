import { getBlackbookRole } from "@/lib/blackbookAuth";
import { listBlackbookEntries } from "@/lib/blackbookStore";
import { getPrincipal, homeFor } from "@/lib/session";
import { redirect } from "next/navigation";
import BlackbookView from "./BlackbookView";
import { getVenue } from "@/lib/venues";
export const dynamic = "force-dynamic";
export default async function BlackbookPage({ params }: { params: Promise<{ venue: string }> }) {
    const venue = getVenue((await params).venue);
    const role = await getBlackbookRole();
    if (!role) {
        const principal = await getPrincipal();
        if (!principal)
            redirect(`/admin/login?next=${encodeURIComponent(`${venue.basePath}/blackbook`)}`);
        redirect((await homeFor(principal)) ?? "/admin/no-access");
    }
    const entries = await listBlackbookEntries(venue);
    return <BlackbookView initialEntries={entries} canEdit={role === "admin"}/>;
}
