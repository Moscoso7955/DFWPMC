"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Concept } from "@/lib/concepts";

/**
 * Interactive facade: the building rendering with three hover zones that
 * map to where each concept physically lives (viewed from the east —
 * tower on the right). Hovering a zone dims the rest of the building and
 * expands that concept's teaser; clicking enters its page.
 */
export function BuildingHero({ concepts }: { concepts: Concept[] }) {
  const [active, setActive] = useState<string | null>(null);

  const zones: Record<Concept["zone"], string> = {
    left: "left-0 w-[32%]",
    center: "left-[32%] w-[34%]",
    right: "left-[66%] w-[34%]",
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-cream/10 shadow-2xl"
      style={{ aspectRatio: "748 / 404" }}
      onMouseLeave={() => setActive(null)}
    >
      <Image
        src="/images/building.jpg"
        alt="The historic Fort Worth Public Market building at dusk"
        fill
        priority
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
      />

      {/* Dim layer over inactive zones */}
      {concepts.map((c) => (
        <div
          key={`dim-${c.slug}`}
          aria-hidden
          className={`absolute top-0 h-full ${zones[c.zone]} bg-night/70 transition-opacity duration-300 ${
            active && active !== c.slug ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Hover / click zones */}
      {concepts.map((c) => (
        <Link
          key={c.slug}
          href={`/${c.slug}`}
          aria-label={`${c.name} — ${c.kicker}`}
          onMouseEnter={() => setActive(c.slug)}
          onFocus={() => setActive(c.slug)}
          className={`group absolute top-0 flex h-full items-end ${zones[c.zone]}`}
        >
          {/* Zone label (always visible, subtle) */}
          <div
            className={`w-full p-3 pb-4 text-center transition-all duration-300 sm:p-5 ${
              active === c.slug
                ? "bg-gradient-to-t from-night/95 via-night/60 to-transparent"
                : "bg-gradient-to-t from-night/70 to-transparent"
            }`}
          >
            <p
              className={`text-[10px] font-medium uppercase tracking-[0.25em] transition-colors sm:text-xs ${
                active === c.slug ? "text-glow" : "text-cream/70"
              }`}
            >
              {c.kicker}
            </p>
            <p
              className={`${c.theme.displayClass} text-lg leading-tight text-cream sm:text-2xl`}
            >
              {c.name}
            </p>
            {/* Expanded teaser on hover (desktop) */}
            <div
              className={`grid transition-all duration-300 ${
                active === c.slug
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="mx-auto mt-1 hidden max-w-[26ch] text-xs leading-relaxed text-cream/80 sm:block">
                  {c.tagline} · {c.hours[0]?.time}
                </p>
                <p className="mt-2 text-xs font-medium text-glow">
                  Enter {c.name} →
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
