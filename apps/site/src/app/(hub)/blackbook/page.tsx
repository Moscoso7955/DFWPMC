import { getBlackbookRole } from "@/lib/blackbookAuth";
import { listBlackbookEntries } from "@/lib/blackbookStore";
import { getPrincipal, homeFor } from "@/lib/session";
import { redirect } from "next/navigation";
import BlackbookView from "./BlackbookView";
export const dynamic = "force-dynamic";
export default async function BlackbookPage() {
    const role = await getBlackbookRole();
    if (!role) {
        const principal = await getPrincipal();
        if (!principal)
            redirect("/admin/login?next=%2Fblackbook");
        redirect((await homeFor(principal)) ?? "/admin/no-access");
    }
    const entries = await listBlackbookEntries();
    return <BlackbookView initialEntries={entries} canEdit={role === "admin"}/>;
}
