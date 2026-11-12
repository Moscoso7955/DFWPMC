import { redirect } from "next/navigation";

// One business, one policy: the venue URL lands on the collective page.
export default function VenueLegalRedirect() {
    redirect("/terms");
}
