import { venuePath } from "@/lib/venue";
import TicketingPortalShell from "./TicketingPortalShell";
import TicketingEventsList from "./TicketingEventsList";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { listAllEvents } from "@/lib/ticketingStore";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function TicketingPortalHome() {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const events = await listAllEvents();
    return (<TicketingPortalShell role="manager">
      <TicketingEventsList initialEvents={events}/>
    </TicketingPortalShell>);
}
