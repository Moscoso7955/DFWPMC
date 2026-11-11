import { readLocalRecords } from "@/lib/localRecords";
import { VENUES, type VenueConfig } from "@/lib/venues";
import styles from "./AdminEntry.module.css";

const TARGET_LABELS: Record<string, string> = {
  menu: "Menu",
  calendar: "Calendar",
  "private-events": "Private Events",
  reservations: "Reservations",
  story: "Story",
  visit: "Visit",
  contact: "Contact",
  careers: "Careers",
  home: "Home",
};

type DatedRow = { createdAt?: string };
type ClickRow = DatedRow & { target?: string };

function withinDays(iso: string | undefined, days: number) {
  return Boolean(iso) && Date.parse(iso as string) >= Date.now() - days * 86400000;
}

type VenueAnalytics = {
  venue: VenueConfig;
  available: boolean;
  subscribers: { total: number; last30: number };
  contacts: { total: number; last30: number };
  clicks: { total: number; last30: number; topTargets: { target: string; count: number }[] };
};

async function getVenueAnalytics(venue: VenueConfig): Promise<VenueAnalytics> {
  try {
    const [subscribers, contacts, clicks] = await Promise.all([
      readLocalRecords<DatedRow>(venue, "subscribers"),
      readLocalRecords<DatedRow>(venue, "contacts"),
      readLocalRecords<ClickRow>(venue, "menu-clicks"),
    ]);
    const counts = new Map<string, number>();
    for (const click of clicks) {
      const target = click.target ?? "";
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    const topTargets = [...counts.entries()]
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return {
      venue,
      available: true,
      subscribers: { total: subscribers.length, last30: subscribers.filter((r) => withinDays(r.createdAt, 30)).length },
      contacts: { total: contacts.length, last30: contacts.filter((r) => withinDays(r.createdAt, 30)).length },
      clicks: { total: clicks.length, last30: clicks.filter((r) => withinDays(r.createdAt, 30)).length, topTargets },
    };
  } catch {
    return {
      venue,
      available: false,
      subscribers: { total: 0, last30: 0 },
      contacts: { total: 0, last30: 0 },
      clicks: { total: 0, last30: 0, topTargets: [] },
    };
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

// Collective analytics on the selector screen: one card per unit, plus the
// master contact export and the single sign-out.
export default async function CollectiveOverview() {
  const stats = await Promise.all(VENUES.map((venue) => getVenueAnalytics(venue)));

  return (
    <>
      <h2 className={styles.overviewTitle}>Analytics</h2>
      <div className={styles.overview}>
        {stats.map((entry) => (
          <section className={styles.overviewCard} key={entry.venue.slug} aria-label={`${entry.venue.name} analytics`}>
            <h3 className={styles.overviewVenue}>{entry.venue.name}</h3>
            {entry.available ? (
              <>
                <p className={styles.statRow}>
                  <span className={styles.statLabel}>Mailing list</span>
                  <span className={styles.statValue}>
                    {formatNumber(entry.subscribers.total)}{" "}
                    <span className={styles.statMuted}>(+{formatNumber(entry.subscribers.last30)} /30d)</span>
                  </span>
                </p>
                <p className={styles.statRow}>
                  <span className={styles.statLabel}>Contact messages</span>
                  <span className={styles.statValue}>
                    {formatNumber(entry.contacts.total)}{" "}
                    <span className={styles.statMuted}>(+{formatNumber(entry.contacts.last30)} /30d)</span>
                  </span>
                </p>
                <p className={styles.statRow}>
                  <span className={styles.statLabel}>Menu taps</span>
                  <span className={styles.statValue}>
                    {formatNumber(entry.clicks.total)}{" "}
                    <span className={styles.statMuted}>(+{formatNumber(entry.clicks.last30)} /30d)</span>
                  </span>
                </p>
                {entry.clicks.topTargets.length > 0 ? (
                  <p className={styles.statDetail}>
                    Top pages:{" "}
                    {entry.clicks.topTargets
                      .map((t) => `${TARGET_LABELS[t.target] ?? t.target} ${formatNumber(t.count)}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className={styles.statUnavailable}>Data unavailable — check this venue&rsquo;s storage connection.</p>
            )}
          </section>
        ))}
      </div>
      <div className={styles.toolRow}>
        <a className={styles.toolButton} href="/admin/api/master-list">
          Download master contact list
        </a>
        <a className={styles.toolButton} href="/admin/logout">
          Log out
        </a>
      </div>
    </>
  );
}
