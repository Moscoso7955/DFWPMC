import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import { SECTIONS, VENUE_PORTAL_SECTIONS } from "@/lib/collective/sections";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  published: "Draft published. The live site now shows your latest edits.",
  discarded: "Draft discarded. Edits were reset to the published site.",
};

export default async function VenueAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ venue: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  if (!(await hasCollectiveSession())) redirect("/admin/login");
  const { venue: venueSlug } = await params;
  const venue = getCollectiveVenue(venueSlug);
  if (!venue) notFound();
  const { notice, error } = await searchParams;

  return (
    <>
      <header className="fwa-topbar">
        <Link className="fwa-topbar-title" href="/admin">
          The Public Market — Admin
        </Link>
        <div className="fwa-topbar-actions">
          <a
            className="fwa-btn fwa-btn--ghost"
            href={venue.basePath}
            target="_blank"
            rel="noreferrer"
          >
            View site
          </a>
          <form method="post" action="/admin/api/logout">
            <button className="fwa-btn fwa-btn--ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="fwa-main">
        <p className="fwa-crumbs">
          <Link href="/admin">Venues</Link> / {venue.name}
        </p>
        <h1>{venue.name}</h1>
        <p className="fwa-sub">
          Edits save to this venue&rsquo;s draft. Publish applies the whole draft to the live
          site; discard resets the draft to what is currently live.
        </p>

        {notice && NOTICES[notice] ? <p className="fwa-notice">{NOTICES[notice]}</p> : null}
        {error ? (
          <p className="fwa-notice fwa-notice--error">
            Something went wrong: {error}. Please try again.
          </p>
        ) : null}

        <div className="fwa-actions">
          <form method="post" action="/admin/api/publish">
            <input type="hidden" name="venue" value={venue.slug} />
            <button className="fwa-btn" type="submit">
              Publish draft
            </button>
          </form>
          <form method="post" action="/admin/api/discard">
            <input type="hidden" name="venue" value={venue.slug} />
            <button className="fwa-btn fwa-btn--danger" type="submit">
              Discard draft
            </button>
          </form>
        </div>

        <h2>Website sections</h2>
        <div className="fwa-list">
          {SECTIONS.map((section) => (
            <Link
              key={section.slug}
              className="fwa-row"
              href={`/admin/${venue.slug}/${section.slug}`}
            >
              <span>
                {section.title}
                <br />
                <span className="fwa-row-desc">{section.description}</span>
              </span>
              <span className="fwa-badge">
                {venue.basePath}
                {section.publicPath === "/" ? "" : section.publicPath}
              </span>
            </Link>
          ))}
        </div>

        <h2>Venue portal</h2>
        <p className="fwa-sub">
          These tools still open in the {venue.name} portal and use its own sign-in.
        </p>
        <div className="fwa-list">
          {VENUE_PORTAL_SECTIONS.map((item) => (
            <a
              key={item.venuePath}
              className="fwa-row"
              href={`${venue.basePath}${item.venuePath}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>{item.title}</span>
              <span className="fwa-badge">opens venue portal</span>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
