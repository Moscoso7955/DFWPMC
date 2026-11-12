import type { LiveNight } from "@/lib/photoStore";
import { findVenue } from "@/lib/venues";

const stamp = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    md: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
  };
};

/** Live photo nights; the hub names each night's venue, a venue page already is one. */
export default function PhotoNightsList({ nights, showVenue = false }: { nights: LiveNight[]; showVenue?: boolean }) {
  if (nights.length === 0) return null;
  return (
    <section className="photo-nights" aria-labelledby="photo-nights-title">
      <header className="photo-nights-header">
        <h2 id="photo-nights-title">Market Nights</h2>
        <p>Photos from our nights. Free to download.</p>
      </header>
      <ul className="photo-nights-list">
        {nights.map((night) => {
          const s = stamp(night.date);
          const at = showVenue && night.venue ? findVenue(night.venue)?.name : null;
          return (
            <li key={night.path}>
              <a className="photo-night" href={`/photos/${night.path}`}>
                <span className="photo-night-stamp">
                  <span>{s.dow}</span>
                  <strong>{s.md}</strong>
                </span>
                <span className="photo-night-body">
                  <strong>{night.title}</strong>
                  <span>
                    {night.count} photo{night.count === 1 ? "" : "s"}
                    {at ? ` · at ${at}` : ""}
                  </span>
                </span>
                <span className="photo-night-thumbs" aria-hidden="true">
                  {night.previews.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" loading="lazy" />
                  ))}
                </span>
                <span className="photo-night-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
