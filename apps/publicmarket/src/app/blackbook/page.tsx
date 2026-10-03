import { getBlackbookRole } from "@/lib/blackbookAuth";
import { listBlackbookEntries } from "@/lib/blackbookStore";
import { redirect } from "next/navigation";
import BlackbookView from "./BlackbookView";

export const dynamic = "force-dynamic";

export default async function BlackbookPage() {
  const role = await getBlackbookRole();
  if (!role) redirect("/blackbook/login");
  const entries = await listBlackbookEntries();
  return <BlackbookView initialEntries={entries} canEdit={role === "admin"} />;
}
