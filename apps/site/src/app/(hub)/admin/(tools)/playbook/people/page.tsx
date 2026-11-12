import { redirect } from "next/navigation";

// People moved to Settings → People (one list for sign-in, owners and emails).
export default function PlaybookPeoplePage() {
  redirect("/admin/settings");
}
