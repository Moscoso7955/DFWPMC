import DropPin, { VisitAddress } from "@/app/components/DropPin";
import HolderPage from "@/app/components/HolderPage";
import PhotoNightsList from "@/app/components/PhotoNightsList";
import { listLiveNights, type LiveNight } from "@/lib/photoStore";
import { getVenue } from "@/lib/venues";

export const dynamic = "force-dynamic";

type PageViewProps = {
  basePath?: string;
  venueName: string;
  nights?: LiveNight[];
};

export function VisitPageView({ basePath = "", venueName, nights = [] }: PageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 6 holder - visit" pageClassName="page--visit">
      <section className="visit-page" aria-labelledby="visit-page-title">
        <h1 id="visit-page-title">{venueName.toUpperCase()} — VISIT</h1>
        <VisitAddress />
        <PhotoNightsList nights={nights} />
        <DropPin />
      </section>
    </HolderPage>
  );
}

export default async function VisitPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  return <VisitPageView basePath={venue.basePath} venueName={venue.name} nights={await listLiveNights(venue.slug)} />;
}
