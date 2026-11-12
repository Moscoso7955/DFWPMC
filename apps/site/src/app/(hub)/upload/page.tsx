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

  // Recent nights from the calendar (last 60 days, through today).
  const today = chicagoDateKey(new Date());
  const earliest = chicagoDateKey(new Date(Date.now() - 60 * DAY_MS));
  const byDate = new Map<string, string[]>();
  for (const { venue, content } of venueContents) {
  for (const event of content.calendar.events.map((e) => ({ ...e, title: `${venue.name} — ${e.title}` }))) {
    if (event.date > today || event.date < earliest) continue;
    byDate.set(event.date, [...(byDate.get(event.date) ?? []), event.title]);
    }
  }
  const options: NightOption[] = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, titles]) => ({ date, title: cleanTitle(titles[0]), label: titles.join(" + ") }));

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
