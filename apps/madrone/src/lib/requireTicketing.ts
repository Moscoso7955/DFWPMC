import { venuePath } from "@/lib/venue";
import { redirect } from "next/navigation";
import { getTicketingRole } from "./ticketingAuth";
export async function requireTicketingManager() {
    const role = await getTicketingRole();
    if (role !== "manager") {
        redirect("/ticketing/login");
    }
}
export async function requireAnyTicketingRole() {
    const role = await getTicketingRole();
    if (!role) {
        redirect("/ticketing/login");
    }
}
