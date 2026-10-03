import { venuePath } from "@/lib/venue";
import TicketingPortalShell from "../../TicketingPortalShell";
import TicketingEventEditor from "./TicketingEventEditor";
import { getEventById, listAllTiersForEvent, listPromoCodesForEvent } from "@/lib/ticketingStore";
import { notFound, redirect } from "next/navigation";
import { getTicketingRole } from "@/lib/ticketingAuth";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        id: string;
    }>;
};
export default async function TicketingEventPage({ params }: PageProps) {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const { id } = await params;
    const event = await getEventById(id);
    if (!event)
        notFound();
    const [tiers, promos] = await Promise.all([
        listAllTiersForEvent(id),
        listPromoCodesForEvent(id),
    ]);
    return (<TicketingPortalShell role="manager">
      <TicketingEventEditor initialEvent={event} initialTiers={tiers} initialPromos={promos}/>
    </TicketingPortalShell>);
}
