import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const { address } = siteConfig;
  return (
    <footer className="bg-charcoal text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <h3 className="font-display text-xl">{siteConfig.name}</h3>
          <p className="mt-3 max-w-xs text-sm text-cream/70">
            {siteConfig.tagline}
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <a
              href={siteConfig.social.instagram}
              className="text-cream/70 transition-colors hover:text-ember"
            >
              Instagram
            </a>
            <a
              href={siteConfig.social.facebook}
              className="text-cream/70 transition-colors hover:text-ember"
            >
              Facebook
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-cream/50">
            Visit
          </h4>
          <p className="mt-3 text-sm text-cream/80">
            {address.street}
            <br />
            {address.city}, {address.state} {address.zip}
          </p>
          <p className="mt-3 text-sm text-cream/80">
            <a href={`tel:${siteConfig.phone}`} className="hover:text-ember">
              {siteConfig.phone}
            </a>
            <br />
            <a href={`mailto:${siteConfig.email}`} className="hover:text-ember">
              {siteConfig.email}
            </a>
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-cream/50">
            Hours
          </h4>
          <ul className="mt-3 space-y-1 text-sm text-cream/80">
            {siteConfig.hours.map((h) => (
              <li key={h.days}>
                <span className="text-cream">{h.days}:</span> {h.open} –{" "}
                {h.close}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved. ·{" "}
        <Link href="/reservations" className="hover:text-ember">
          Reservations
        </Link>
      </div>
    </footer>
  );
}
