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
  return (
    <>
      <DrawerMenu basePath={basePath} />
      <div className="holder-mobile-header-bg" aria-hidden="true" />
      <Link href={basePath || "/"} className="holder-home-icon" aria-label="Return home">
        <img src="/assets/brand/pm-seal-green.svg" alt="" aria-hidden="true" />
      </Link>
      <main className={pageClassName ? `page ${pageClassName}` : "page"}>
        {children ?? <h1>{label}</h1>}
      </main>
      <nav className="page-menu" aria-label="Return">
        <Link href={basePath || "/"}>
          <span aria-hidden="true">←</span> Return Home
        </Link>
      </nav>
    </>
  );
}
