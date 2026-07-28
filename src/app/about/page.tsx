import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-center font-display text-5xl">Our story</h1>
      <div className="mt-10 space-y-6 leading-relaxed text-charcoal/80">
        <p>
          {siteConfig.name} started with a simple idea: cook honest food over
          real fire, and treat every guest like a neighbor. Our kitchen is
          built around a wood-fired oven and grill, and everything — from the
          dough to the desserts — is made in-house each morning.
        </p>
        <p>
          We work with local farms and producers whenever we can, so the menu
          shifts with the seasons. Some dishes stay because you&apos;d riot if
          they left; the rest follow whatever is best right now.
        </p>
        <p>
          Whether you&apos;re here for a quick lunch, a long dinner, or just a
          drink at the bar, we&apos;re glad you came. Pull up a chair.
        </p>
      </div>
      <div className="mt-12 text-center">
        <Link
          href="/reservations"
          className="rounded-full bg-ember px-8 py-3 font-medium text-cream transition-colors hover:bg-ember-dark"
        >
          Book a table
        </Link>
      </div>
    </div>
  );
}
