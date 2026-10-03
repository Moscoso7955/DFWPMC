import { venuePath } from "@/lib/venue";
import AdminShell from "../AdminShell";
import { getBlackbookStats } from "@/lib/blackbookStore";
import { getContactSubmissionStats } from "@/lib/contactSubmissionsStore";
import { getDraftSiteContent } from "@/lib/siteContent";
import { getMenuClickStats, MENU_CLICK_TARGETS } from "@/lib/menuClicksStore";
import { getSubscriberStats } from "@/lib/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";
const MENU_TARGET_LABELS: Record<string, string> = {
    menu: "Menu",
    calendar: "Calendar",
    "private-events": "Book an Event",
    reservations: "Reservations",
    story: "Story",
    visit: "Visit",
    contact: "Contact",
    careers: "Careers",
    home: "← Home",
};
export const dynamic = "force-dynamic";
function formatDate(iso: string | null) {
    if (!iso)
        return "—";
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
function formatNumber(value: number) {
    return value.toLocaleString("en-US");
}
export default async function AdminAnalyticsPage() {
    await requireAdminSession();
    const [submissions, subscribers, blackbook, content, menuClicks] = await Promise.all([
        getContactSubmissionStats(),
        getSubscriberStats(),
        getBlackbookStats(),
        getDraftSiteContent(),
        getMenuClickStats(),
    ]);
    const rankedTargets = [...MENU_CLICK_TARGETS].sort((a, b) => menuClicks.totals[b] - menuClicks.totals[a]);
    const nowIso = new Date().toISOString().slice(0, 10);
    const upcomingEvents = content.calendar.events.filter((event) => event.date >= nowIso).length;
    const pastEvents = content.calendar.events.length - upcomingEvents;
    return (<AdminShell>
      <section className="admin-analytics">
        <header className="admin-analytics-header">
          <h1>Analytics</h1>
          <p>Activity saved in this local preview. Updated on every page load.</p>
        </header>

        <div className="admin-analytics-grid">
          <article className="admin-analytics-card">
            <h2>Contact Submissions</h2>
            <dl className="admin-stat-rows">
              <dt>All-time</dt>
              <dd>{formatNumber(submissions.total)}</dd>
              <dt>Last 30 days</dt>
              <dd>{formatNumber(submissions.last30Days)}</dd>
              <dt>Last 7 days</dt>
              <dd>{formatNumber(submissions.last7Days)}</dd>
              <dt>Most recent</dt>
              <dd>{formatDate(submissions.mostRecent)}</dd>
            </dl>
            <a className="admin-analytics-link" href={venuePath("/admin/submissions")}>
              View submissions →
            </a>
          </article>

          <article className="admin-analytics-card">
            <h2>Mailing List</h2>
            <dl className="admin-stat-rows">
              <dt>Total subscribers</dt>
              <dd>{formatNumber(subscribers.total)}</dd>
              <dt>From newsletter signup</dt>
              <dd>{formatNumber(subscribers.fromNewsletter)}</dd>
              <dt>From contact form</dt>
              <dd>{formatNumber(subscribers.fromContactForm)}</dd>
              <dt>From ticket purchase</dt>
              <dd>{formatNumber(subscribers.fromTicketPurchase)}</dd>
              <dt>New in last 30 days</dt>
              <dd>{formatNumber(subscribers.last30Days)}</dd>
            </dl>
            <a className="admin-analytics-link" href={venuePath("/admin/mailing-list")}>
              View mailing list →
            </a>
          </article>

          <article className="admin-analytics-card">
            <h2>Blackbook — Preview data</h2>
            <dl className="admin-stat-rows">
              <dt>Total entries</dt>
              <dd>{formatNumber(blackbook.total)}</dd>
              <dt>VIPs</dt>
              <dd>{formatNumber(blackbook.vip)}</dd>
              <dt>Banned</dt>
              <dd>{formatNumber(blackbook.banned)}</dd>
            </dl>
            <a className="admin-analytics-link" href={venuePath("/blackbook")} target="_blank" rel="noopener noreferrer">
              Open Blackbook ↗
            </a>
          </article>

          <article className="admin-analytics-card">
            <h2>Calendar</h2>
            <dl className="admin-stat-rows">
              <dt>Upcoming events</dt>
              <dd>{formatNumber(upcomingEvents)}</dd>
              <dt>Past events</dt>
              <dd>{formatNumber(pastEvents)}</dd>
              <dt>Total on calendar</dt>
              <dd>{formatNumber(content.calendar.events.length)}</dd>
            </dl>
            <a className="admin-analytics-link" href={venuePath("/admin/calendar")}>
              Manage calendar →
            </a>
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Menu Clicks</h2>
            <p className="admin-analytics-copy">
              Counts local taps on this venue’s public bottom menu and drawer links.
            </p>
            <table className="admin-menu-clicks">
              <thead>
                <tr>
                  <th scope="col">Destination</th>
                  <th scope="col">All-time</th>
                  <th scope="col">Last 30 days</th>
                </tr>
              </thead>
              <tbody>
                {rankedTargets.map((target) => (<tr key={target}>
                    <th scope="row">{MENU_TARGET_LABELS[target] ?? target}</th>
                    <td>{formatNumber(menuClicks.totals[target])}</td>
                    <td>{formatNumber(menuClicks.last30[target])}</td>
                  </tr>))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Overall</th>
                  <td>{formatNumber(menuClicks.overallTotal)}</td>
                  <td>{formatNumber(menuClicks.overallLast30)}</td>
                </tr>
              </tfoot>
            </table>
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Traffic Analytics</h2>
            <p className="admin-analytics-copy">
              External traffic analytics are not connected yet. Contact, subscriber, and menu-click counts above use local files.
            </p>
            <button className="admin-analytics-link admin-analytics-link--button" disabled title="Analytics connection pending">
              Open Vercel Analytics — not connected
            </button>
          </article>
        </div>
      </section>
    </AdminShell>);
}
