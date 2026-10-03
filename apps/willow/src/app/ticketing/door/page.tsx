import { venuePath } from "@/lib/venue";
import { redirect } from "next/navigation";
// The door scanner now lives in the Blackbook, next to the VIP and
// banned lists, so security has both on one screen.
export default function TicketingDoorPage() {
    redirect("/blackbook");
}
