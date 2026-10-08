import { getAllVenueAnalytics } from "@/lib/collective/venueData";
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

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

// Collective analytics on the selector screen: one card per unit, plus the
// master contact export and the single sign-out.
export default async function CollectiveOverview() {
  const stats = await getAllVenueAnalytics();

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
