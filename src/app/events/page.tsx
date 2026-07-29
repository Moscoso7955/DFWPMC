import type { Metadata } from "next";
import Link from "next/link";
import { collective, concepts } from "@/lib/concepts";

export const metadata: Metadata = {
  title: "Private Events",
};

export default function EventsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-night text-cream">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-display text-sm uppercase tracking-[0.25em] text-cream/90"
          >
            {collective.shortName}{" "}
            <span className="text-cream/50">{collective.suffix}</span>
          </Link>
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
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-16 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-glow">
            Private Events & Buyouts
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            The whole building, or just a corner of it
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-cream/70">
            Madrone&apos;s hidden private dining room, Willow&apos;s VIP room,
            the market hall at golden hour — or a full buyout of the landmark.
            Tell us what you&apos;re celebrating.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-cream/10 bg-white">
            <iframe
              src={collective.eventsEmbedUrl}
              style={{ width: "100%", height: 1100, border: 0 }}
              loading="lazy"
              title="Event booking form"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-cream/10 py-6 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {collective.name} {collective.suffix} ·{" "}
        {collective.address.street}, {collective.address.city},{" "}
        {collective.address.state}
      </footer>
    </div>
  );
}
