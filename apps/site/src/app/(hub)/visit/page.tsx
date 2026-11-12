import DropPin, { VisitAddress } from "../components/DropPin";
import HolderPage from "../components/HolderPage";
import PhotoNightsList from "@/app/components/PhotoNightsList";
import { listLiveNights, type LiveNight } from "@/lib/photoStore";

export const dynamic = "force-dynamic";

type PageViewProps = {
  basePath?: string;
  nights?: LiveNight[];
};

export function VisitPageView({ basePath = "", nights = [] }: PageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 6 holder - visit" pageClassName="page--visit">
      <section className="visit-page" aria-labelledby="visit-page-title">
        <h1 id="visit-page-title">THE PUBLIC MARKET - FORT WORTH, TEXAS</h1>
        <VisitAddress />
        <PhotoNightsList nights={nights} showVenue />
        <DropPin />
      </section>
    </HolderPage>
  );
}

export default async function VisitPage() {
  return <VisitPageView nights={await listLiveNights()} />;
}
