import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { getFeaturedItems } from "@/lib/data";

export default async function HomePage() {
  const featured = await getFeaturedItems();

  return (
    <>
      {/* Hero */}
      <section className="bg-espresso text-cream">
        <div className="mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-ember">
            {siteConfig.address.city}, {siteConfig.address.state}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">
            {siteConfig.tagline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/80">
            {siteConfig.description}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/reservations"
              className="rounded-full bg-ember px-8 py-3 font-medium transition-colors hover:bg-ember-dark"
            >
              Book a table
            </Link>
            <Link
              href="/menu"
              className="rounded-full border border-cream/40 px-8 py-3 font-medium transition-colors hover:border-cream hover:bg-cream/10"
            >
              View the menu
            </Link>
          </div>
        </div>
      </section>

      {/* Featured dishes */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl">From the kitchen</h2>
        <p className="mt-3 text-center text-charcoal/60">
          A few favorites our guests keep coming back for.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {featured.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-charcoal/10 bg-white p-8 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl">{item.name}</h3>
                <span className="font-medium text-ember">${item.price}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/menu"
            className="font-medium text-ember underline-offset-4 hover:underline"
          >
            See the full menu →
          </Link>
        </div>
      </section>

      {/* Hours & location */}
      <section className="bg-charcoal text-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">Find us</h2>
            <p className="mt-4 text-cream/80">
              {siteConfig.address.street}
              <br />
              {siteConfig.address.city}, {siteConfig.address.state}{" "}
              {siteConfig.address.zip}
            </p>
            <p className="mt-4 text-cream/80">
              <a href={`tel:${siteConfig.phone}`} className="hover:text-ember">
                {siteConfig.phone}
              </a>
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl">Hours</h2>
            <ul className="mt-4 space-y-2 text-cream/80">
              {siteConfig.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-6">
                  <span>{h.days}</span>
                  <span>
                    {h.open} – {h.close}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
