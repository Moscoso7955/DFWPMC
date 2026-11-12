import AdminShell from "../AdminShell";
import { VisitPageView } from "../../visit/page";
import { listLiveNights } from "@/lib/photoStore";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminVisitPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  return (
    <AdminShell
      venue={venue}
      shortcuts={[{ href: `${venue.basePath}/admin/hours`, label: "Hours" }]}
    >
      <p className="admin-preview-note" role="note">
        Nothing to edit on this page: the hours come from Hours.
      </p>
      <VisitPageView basePath={`${venue.basePath}/admin`} venueName={venue.name} nights={await listLiveNights(venue.slug)} />
    </AdminShell>
  );
}
