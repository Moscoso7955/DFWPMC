import AdminShell from "../AdminShell";
import { VisitPageView } from "../../visit/page";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function AdminVisitPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  await requireAdminSession();
  return (
    <AdminShell venue={venue}>
      <VisitPageView basePath={`${venue.basePath}/admin`} venueName={venue.name} />
    </AdminShell>
  );
}
