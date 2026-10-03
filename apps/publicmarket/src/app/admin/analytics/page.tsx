import AdminShell from "../AdminShell";
import { getBlackbookStats } from "@/lib/blackbookStore";
import { getContactSubmissionStats } from "@/lib/contactSubmissionsStore";
import { getDraftSiteContent } from "@/lib/siteContent";
import { getSubscriberStats } from "@/lib/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export default async function AdminAnalyticsPage() {
  await requireAdminSession();

  const [submissions, subscribers, blackbook, content] = await Promise.all([
    getContactSubmissionStats(),
    getSubscriberStats(),
    getBlackbookStats(),
    getDraftSiteContent(),
  ]);

  const nowIso = new Date().toISOString().slice(0, 10);
  const upcomingEvents = content.calendar.events.filter((event) => event.date >= nowIso).length;
  const pastEvents = content.calendar.events.length - upcomingEvents;

  return (
    <AdminShell>
      <section className="admin-analytics">
        <header className="admin-analytics-header">
          <h1>Analytics</h1>
          <p>Snapshot of activity across the site. Updated on every page load.</p>
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
            <a className="admin-analytics-link" href="/admin/submissions">
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
              <dt>New in last 30 days</dt>
              <dd>{formatNumber(subscribers.last30Days)}</dd>
            </dl>
            <a className="admin-analytics-link" href="/admin/mailing-list">
              View mailing list →
            </a>
          </article>

          <article className="admin-analytics-card">
            <h2>Blackbook</h2>
            <dl className="admin-stat-rows">
              <dt>Total entries</dt>
              <dd>{formatNumber(blackbook.total)}</dd>
              <dt>VIPs</dt>
              <dd>{formatNumber(blackbook.vip)}</dd>
              <dt>Banned</dt>
              <dd>{formatNumber(blackbook.banned)}</dd>
            </dl>
            <a className="admin-analytics-link" href="/blackbook" target="_blank" rel="noopener noreferrer">
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
            <a className="admin-analytics-link" href="/admin/calendar">
              Manage calendar →
            </a>
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Traffic Analytics</h2>
            <p className="admin-analytics-copy">
              Page views, top pages, referrers, device breakdown, and country data are tracked by Vercel Web
              Analytics. Vercel doesn&apos;t expose that data through an API, so the charts live in the Vercel
              dashboard.
            </p>
            <a
              className="admin-analytics-link admin-analytics-link--button"
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Vercel Analytics ↗
            </a>
          </article>
        </div>
      </section>
    </AdminShell>
  );
}
