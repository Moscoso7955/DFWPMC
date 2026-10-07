import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasCollectiveSession } from "@/lib/collective/auth";
import { getCollectiveVenue } from "@/lib/collective/venues";
import { getSection } from "@/lib/collective/sections";
import { getDraftContent } from "@/lib/collective/content";
import type { SiteContent } from "@/lib/collective/schema";
import SectionEditor from "./SectionEditor";

export const dynamic = "force-dynamic";

export default async function SectionAdminPage({
  params,
}: {
  params: Promise<{ venue: string; section: string }>;
}) {
  if (!(await hasCollectiveSession())) redirect("/admin/login");
  const { venue: venueSlug, section: sectionSlug } = await params;
  const venue = getCollectiveVenue(venueSlug);
  const section = sectionSlug ? getSection(sectionSlug) : undefined;
  if (!venue || !section) notFound();

  let loadError: string | null = null;
  const values: Record<string, string> = {};
  try {
    const draft = await getDraftContent(venue);
    const sectionValue = draft[section.contentKey as keyof SiteContent] as
      | Record<string, unknown>
      | undefined;
    for (const field of section.fields) {
      const raw = sectionValue?.[field.name];
      values[field.name] = typeof raw === "string" ? raw : "";
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load this venue's content.";
  }

  return (
    <>
      <header className="fwa-topbar">
        <Link className="fwa-topbar-title" href="/admin">
          The Public Market — Admin
        </Link>
        <div className="fwa-topbar-actions">
          <a
            className="fwa-btn fwa-btn--ghost"
            href={`${venue.basePath}${section.publicPath === "/" ? "" : section.publicPath}`}
            target="_blank"
            rel="noreferrer"
          >
            View page
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
          <Link href="/admin">Venues</Link> /{" "}
          <Link href={`/admin/${venue.slug}`}>{venue.name}</Link> / {section.title}
        </p>
        <h1>
          {venue.name} — {section.title}
        </h1>
        <p className="fwa-sub">
          {section.description} Changes save to the draft; publish from the {venue.name} page
          when you&rsquo;re ready.
        </p>
        {loadError ? (
          <p className="fwa-notice fwa-notice--error">{loadError}</p>
        ) : (
          <SectionEditor
            venueSlug={venue.slug}
            venueBasePath={venue.basePath}
            sectionSlug={section.slug}
            fields={section.fields}
            initialValues={values}
          />
        )}
      </main>
    </>
  );
}
