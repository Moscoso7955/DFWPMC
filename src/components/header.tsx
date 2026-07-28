import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/reservations", label: "Reservations" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-charcoal text-cream shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-1 transition-colors hover:text-ember"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/reservations"
            className="hidden rounded-full bg-ember px-4 py-2 font-medium text-cream transition-colors hover:bg-ember-dark sm:block"
          >
            Book a table
          </Link>
        </nav>
      </div>
    </header>
  );
}
