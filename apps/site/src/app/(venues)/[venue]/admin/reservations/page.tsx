import AdminShell from "../AdminShell";
import AdminReservationsEditor from "./AdminReservationsEditor";
import { getDraftSiteContent } from "@/lib/siteContent";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  const content = await getDraftSiteContent(venue);

  return (
    <AdminShell venue={venue}>
      <AdminReservationsEditor initialContent={content.reservations} />
    </AdminShell>
  );
}
