import { redirect } from "next/navigation";
import { getPublishedSiteContent } from "@/lib/siteContent";
import { VENUES } from "@/lib/venues";
import { requireContributor } from "@/lib/contributorAuth";
import { listContributorNights } from "@/lib/photoStore";
import { isPhotoStorageConfigured } from "@/lib/r2";
import UploadClient, { type NightOption } from "./UploadClient";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function chicagoDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function cleanTitle(title: string) {
  return title.replace(/^live music:\s*/i, "").trim() || title.trim();
}

export default async function UploadPage() {
  if (!process.env.POSTGRES_URL) redirect("/upload/login");
  const contributor = await requireContributor();
  const [venueContents, nights] = await Promise.all([
    Promise.all(VENUES.map(async (venue) => ({ venue, content: await getPublishedSiteContent(venue) }))),
    listContributorNights(contributor.id),
  ]);

  // Recent nights from each venue's calendar (last 60 days, through today).
  // One option per venue and date, so picking one tags the night's venue.
  const today = chicagoDateKey(new Date());
  const earliest = chicagoDateKey(new Date(Date.now() - 60 * DAY_MS));
  const byVenueDate = new Map<string, { venue: string; venueName: string; date: string; titles: string[] }>();
  for (const { venue, content } of venueContents) {
    for (const event of content.calendar.events) {
      if (event.date > today || event.date < earliest) continue;
      const key = `${event.date}:${venue.slug}`;
      const entry = byVenueDate.get(key) ?? { venue: venue.slug, venueName: venue.name, date: event.date, titles: [] };
      entry.titles.push(event.title);
      byVenueDate.set(key, entry);
    }
  }
  const options: NightOption[] = [...byVenueDate.values()]
    .sort((a, b) => (a.date === b.date ? a.venueName.localeCompare(b.venueName) : a.date < b.date ? 1 : -1))
    .map((e) => ({
      key: `${e.date}:${e.venue}`,
      date: e.date,
      venue: e.venue,
      title: cleanTitle(e.titles[0]),
      label: `${e.venueName} — ${e.titles.map(cleanTitle).join(" + ")}`,
    }));

  return (
    <main className="upload-page">
      <header className="upload-header">
        <div className="admin-login-logo" role="img" aria-label="The Public Market" />
        <form action="/upload/api/logout" method="post">
          Signed in as <strong>{contributor.name}</strong> · <button type="submit" className="upload-logout">Log out</button>
        </form>
      </header>
      <UploadClient options={options} nights={nights} storageReady={isPhotoStorageConfigured()} />
    </main>
  );
}
