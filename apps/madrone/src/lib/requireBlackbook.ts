import { venuePath } from "@/lib/venue";
import { redirect } from "next/navigation";
import { hasBlackbookSession } from "./blackbookAuth";
export async function requireBlackbookSession() {
    if (!(await hasBlackbookSession())) {
        redirect("/blackbook/login");
    }
}
