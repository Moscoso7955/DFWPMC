import Link from "next/link";
import { collective, concepts } from "@/lib/concepts";
import { BuildingHero } from "@/components/building-hero";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-night text-cream">
      {/* Top bar */}
      <header className="border-b border-cream/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <p className="font-display text-sm uppercase tracking-[0.25em] text-cream/90">
            {collective.shortName}{" "}
            <span className="text-cream/50">{collective.suffix}</span>
          </p>
          <nav className="flex items-center gap-5 text-sm text-cream/70">
            {concepts.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="hidden transition-colors hover:text-glow sm:block"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/events"
              className="rounded-full border border-cream/30 px-4 py-1.5 transition-colors hover:border-glow hover:text-glow"
            >
              Private Events
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-14 text-center sm:pt-20">
          <p className="rise text-xs font-medium uppercase tracking-[0.35em] text-glow">
            Fort Worth, Texas · Est. 1930
          </p>
          <h1 className="rise mt-4 font-display text-4xl leading-tight sm:text-6xl">
            {collective.tagline}
          </h1>
          <p className="rise-1 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-cream/70 sm:text-lg">
            {collective.description}
          </p>
          <p className="rise-2 mt-8 text-xs uppercase tracking-[0.25em] text-cream/50">
            Explore the building — each door is its own world
          </p>
        </section>

        {/* Interactive building */}
        <section className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
          <BuildingHero concepts={concepts} />
        </section>

        {/* Concept cards (mobile path + detail) */}
        <section className="mx-auto grid max-w-5xl gap-5 px-6 py-14 sm:grid-cols-3">
          {concepts.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="group rounded-2xl border border-cream/10 bg-dusk p-7 transition-colors hover:border-glow/50"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-glow">
                {c.kicker}
              </p>
              <h2 className={`${c.theme.displayClass} mt-2 text-3xl`}>
                {c.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                {c.description}
              </p>
              <p className="mt-4 text-xs text-cream/50">{c.location}</p>
              <p className="mt-5 text-sm font-medium text-glow">
                Enter <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
              </p>
            </Link>
          ))}
        </section>

        {/* The building */}
        <section className="border-t border-cream/10 bg-dusk">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl">The building</h2>
              <p className="mt-4 text-sm leading-relaxed text-cream/70">
                Opened in 1930, the Public Market building fed Fort Worth for
                a generation — farmers&apos; stalls in the hall, the tower
                marking
                the corner. Nearly a century later, the collective brings it
                back to the table: three concepts under one roof, sharing a
                kitchen along the west wall and the historical corridor that
                ties them together.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl">Visit</h2>
              <p className="mt-4 text-sm text-cream/70">
                {collective.address.street}
                <br />
                {collective.address.city}, {collective.address.state}{" "}
                {collective.address.zip}
              </p>
              <div className="mt-5 space-y-1 text-sm text-cream/70">
                {concepts.map((c) => (
                  <p key={c.slug} className="flex justify-between gap-6 border-b border-cream/10 pb-1.5">
                    <span>{c.name}</span>
                    <span className="text-cream/50">
                      {c.hours[0]?.days}, {c.hours[0]?.time}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-cream/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-cream/50">
          <p>
            © {new Date().getFullYear()} {collective.name} {collective.suffix}
          </p>
          <div className="flex gap-5">
            {concepts.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="hover:text-glow">
                {c.name}
              </Link>
            ))}
            <Link href="/events" className="hover:text-glow">
              Private Events
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
