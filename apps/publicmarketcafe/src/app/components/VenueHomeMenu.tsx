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
        <Link href={getHref(basePath, "/menu")}>
          <span>Menu</span>
        </Link>
        <Link href={getHref(basePath, "/careers")}>
          <span>Careers</span>
        </Link>
      </div>
      <div className="menu-row">
        <Link href={getHref(basePath, "/reservations")}>
          <span>Reservations</span>
        </Link>
        <Link href={getHref(basePath, "/story")}>
          <span>Story</span>
        </Link>
      </div>
    </nav>
  );
}
