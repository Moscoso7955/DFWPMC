"use client";
import { useVenue } from "./VenueProvider";
import Link from "next/link";
import type { ReactNode } from "react";
import DrawerMenu from "./DrawerMenu";
type HolderPageProps = {
    basePath?: string;
    children?: ReactNode;
    label: string;
    pageClassName?: string;
};
export default function HolderPage({ basePath = "", children, label, pageClassName }: HolderPageProps) {
    const { venue, venuePath, venueSrcSet } = useVenue();
    const base = basePath ? venuePath(basePath) : venue.basePath;
    return (<>
      <DrawerMenu basePath={base}/>
      <div className="holder-mobile-header-bg" aria-hidden="true"/>
      <Link href={base || "/"} className="holder-home-icon" aria-label="Return home">
        <img src={venuePath("/assets/brand/venue-logo.svg")} srcSet={venueSrcSet("/assets/brand/venue-logo.svg 1x, /assets/brand/venue-logo.svg 2x")} alt="" aria-hidden="true"/>
      </Link>
      <main className={pageClassName ? `page ${pageClassName}` : "page"}>
        {children ?? <h1>{label}</h1>}
      </main>
      <nav className="page-menu" aria-label="Return">
        <Link href={base || "/"}>
          <span aria-hidden="true">←</span> Return Home
        </Link>
      </nav>
    </>);
}
