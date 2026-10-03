import DropPin from "../components/DropPin";
import HolderPage from "../components/HolderPage";

type PageViewProps = {
  basePath?: string;
};

export function VisitPageView({ basePath = "" }: PageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 6 holder - visit" pageClassName="page--visit">
      <section className="visit-page" aria-labelledby="visit-page-title">
        <h1 id="visit-page-title">WILLOW — VISIT</h1>
        <DropPin />
      </section>
    </HolderPage>
  );
}

export default function VisitPage() {
  return <VisitPageView />;
}
