import DropPin from "@/app/components/DropPin";
import HolderPage from "@/app/components/HolderPage";
import { getVenue } from "@/lib/venues";

type PageViewProps = {
  basePath?: string;
  venueName: string;
};

export function VisitPageView({ basePath = "", venueName }: PageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 6 holder - visit" pageClassName="page--visit">
      <section className="visit-page" aria-labelledby="visit-page-title">
        <h1 id="visit-page-title">{venueName.toUpperCase()} — VISIT</h1>
        <DropPin />
      </section>
    </HolderPage>
  );
}

export default async function VisitPage({ params }: { params: Promise<{ venue: string }> }) {
  const venue = getVenue((await params).venue);
  return <VisitPageView basePath={venue.basePath} venueName={venue.name} />;
}
