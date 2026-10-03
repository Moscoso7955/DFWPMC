import Link from "next/link";

type BottomMenuProps = {
  basePath?: string;
};

function getHref(basePath: string, href: string) {
  return `${basePath}${href}`;
}

export default function BottomMenu({ basePath = "" }: BottomMenuProps) {
  return (
    <nav className="bottom-menu" aria-label="Primary">
      <div className="menu-row">
        <Link className="menu-link--menu-shape" href={getHref(basePath, "/menu")}>
          <span>Menu</span>
          <span className="menu-link__mosaic-accent" aria-hidden="true" />
        </Link>
        <Link className="menu-link--right-shape" href={getHref(basePath, "/careers")}>
          <span>Careers</span>
          <span className="menu-link__mosaic-accent menu-link__mosaic-accent--right" aria-hidden="true" />
        </Link>
      </div>
      <div className="menu-row">
        <Link className="menu-link--menu-shape" href={getHref(basePath, "/reservations")}>
          <span>Reservations</span>
          <span className="menu-link__mosaic-accent" aria-hidden="true" />
        </Link>
        <Link className="menu-link--right-shape" href={getHref(basePath, "/story")}>
          <span>Story</span>
          <span className="menu-link__mosaic-accent menu-link__mosaic-accent--right" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
