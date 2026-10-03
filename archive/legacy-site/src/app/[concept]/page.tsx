import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collective, concepts, getConcept } from "@/lib/concepts";

export function generateStaticParams() {
  return concepts.map((c) => ({ concept: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}): Promise<Metadata> {
  const concept = getConcept((await params).concept);
  if (!concept) return {};
  return {
    title: `${concept.name} — ${concept.kicker}`,
    description: concept.description,
  };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const concept = getConcept((await params).concept);
  if (!concept) notFound();

  const t = concept.theme;
  const display = t.displayClass;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: t.bg, color: t.ink }}
    >
      {/* Concept top bar */}
      <header style={{ borderBottom: `1px solid ${t.ink}1f` }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <Link
            href={`/${concept.slug}`}
            className={`${display} text-2xl tracking-wide`}
          >
            {concept.name}
          </Link>
          <div className="flex items-center gap-5 text-xs">
            <Link
              href="/"
              className="uppercase tracking-[0.2em] opacity-60 transition-opacity hover:opacity-100"
            >
              {collective.shortName} {collective.suffix}
            </Link>
            {concept.tockUrl ? (
              <a
                href={concept.tockUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ background: t.accent, color: t.bg }}
              >
                Reserve
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
          <p
            className="text-xs font-medium uppercase tracking-[0.35em]"
            style={{ color: t.accent }}
          >
            {concept.kicker} · {collective.address.city},{" "}
            {collective.address.state}
          </p>
          <h1 className={`${display} mt-4 text-5xl leading-tight sm:text-7xl`}>
            {concept.tagline}
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: t.muted }}
          >
            {concept.description}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {concept.tockUrl ? (
              <a
                href={concept.tockUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-8 py-3 font-medium"
                style={{ background: t.accent, color: t.bg }}
              >
                Reserve on Tock
              </a>
            ) : (
              <span
                className="rounded-full border px-8 py-3 text-sm"
                style={{ borderColor: `${t.ink}44`, color: t.muted }}
              >
                {concept.reserveNote}
              </span>
            )}
          </div>
          <p className="mt-6 text-xs" style={{ color: t.muted }}>
            {concept.hours.map((h) => `${h.days} · ${h.time}`).join("  —  ")}
          </p>
        </section>

        {/* Menu */}
        <section
          className="border-t"
          style={{ borderColor: `${t.ink}1f`, background: t.surface }}
        >
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className={`${display} text-center text-4xl`}>Menu</h2>
            <p
              className="mt-3 text-center text-xs uppercase tracking-[0.25em]"
              style={{ color: t.muted }}
            >
              A first look — menus change with the seasons
            </p>
            {concept.menu.map((section) => (
              <div key={section.title} className="mt-12">
                <h3
                  className="text-sm font-medium uppercase tracking-[0.25em]"
                  style={{ color: t.accent }}
                >
                  {section.title}
                </h3>
                <ul
                  className="mt-4 divide-y"
                  style={{ borderColor: `${t.ink}14` }}
                >
                  {section.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-baseline justify-between gap-6 py-3"
                      style={{ borderColor: `${t.ink}14` }}
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-0.5 text-sm" style={{ color: t.muted }}>
                          {item.description}
                        </p>
                      </div>
                      {item.price ? (
                        <span style={{ color: t.accent }}>{item.price}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Visit */}
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className={`${display} text-3xl`}>Find us in the building</h2>
          <p className="mt-3 text-sm" style={{ color: t.muted }}>
            {concept.location}
          </p>
          <p className="mt-4 text-sm" style={{ color: t.muted }}>
            {collective.address.street}, {collective.address.city},{" "}
            {collective.address.state} {collective.address.zip}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/"
              className="underline-offset-4 hover:underline"
              style={{ color: t.accent }}
            >
              ← Back to the collective
            </Link>
            <Link
              href="/events"
              className="underline-offset-4 hover:underline"
              style={{ color: t.accent }}
            >
              Host a private event
            </Link>
          </div>
        </section>
      </main>

      <footer
        className="border-t py-6 text-center text-xs"
        style={{ borderColor: `${t.ink}1f`, color: t.muted }}
      >
        {concept.name} · part of the {collective.name} {collective.suffix}
      </footer>
    </div>
  );
}
