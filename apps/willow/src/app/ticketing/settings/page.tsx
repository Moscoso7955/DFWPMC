import { venuePath } from "@/lib/venue";
import TicketingPortalShell from "../TicketingPortalShell";
import TicketingSettingsEditor from "./TicketingSettingsEditor";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { getTicketingSettings } from "@/lib/ticketingStore";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
    const role = await getTicketingRole();
    if (!role)
        redirect("/ticketing/login");
    if (role === "door")
        redirect("/ticketing/door");
    const settings = await getTicketingSettings();
    return (<TicketingPortalShell role="manager">
      <TicketingSettingsEditor initialSettings={settings}/>
    </TicketingPortalShell>);
}
