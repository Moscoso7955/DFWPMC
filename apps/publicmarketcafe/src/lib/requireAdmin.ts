import { venuePath } from "@/lib/venue";
import { redirect } from "next/navigation";
import { hasAdminSession } from "./adminAuth";
export async function requireAdminSession() {
    if (!(await hasAdminSession())) {
        redirect("/admin/login");
    }
}
