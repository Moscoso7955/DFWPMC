import { venuePath } from "@/lib/venue";
import { getBlackbookRole } from "@/lib/blackbookAuth";
import { listBlackbookEntries } from "@/lib/blackbookStore";
import { listDoorEventsForToday } from "@/lib/ticketingStore";
import { redirect } from "next/navigation";
import BlackbookView from "./BlackbookView";
export const dynamic = "force-dynamic";
export default async function BlackbookPage() {
    const role = await getBlackbookRole();
    if (!role)
        redirect("/blackbook/login");
    const [entries, doorEvents] = await Promise.all([listBlackbookEntries(), listDoorEventsForToday()]);
    return <BlackbookView initialEntries={entries} canEdit={role === "admin"} doorEvents={doorEvents}/>;
}
