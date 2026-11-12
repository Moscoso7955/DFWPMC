import { Fragment } from "react";
import CollectiveShell from "../CollectiveShell";
import { getBlackbookStats } from "@/lib/blackbookStore";
import { getContactSubmissionStats } from "@/lib/contactSubmissionsStore";
import { getContactSubmissionStats as getHubContactStats } from "@/lib/hub/contactSubmissionsStore";
import { getDraftSiteContent } from "@/lib/siteContent";
import { getMenuClickStats, MENU_CLICK_TARGETS, type MenuClickTarget } from "@/lib/menuClicksStore";
import { getPageViewStats } from "@/lib/pageViewsStore";
import { getSubscriberStats } from "@/lib/subscribersStore";
import { getSubscriberStats as getHubSubscriberStats } from "@/lib/hub/subscribersStore";
import { requireAdminSession } from "@/lib/requireAdmin";
import { listNightsForAdmin } from "@/lib/photoStore";
import { getOpexSummary } from "@/lib/opexStore";
import { VENUES } from "@/lib/venues";
import OpexCard from "./OpexCard";

// The collective's one Analytics page: the business is one entity, so
// costs, mailing list, messages, page views, photos and the Blackbook are
// single numbers — only menu taps stay side by side per venue.

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
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

const latest = (values: (string | null)[]) => values.filter((v): v is string => Boolean(v)).sort().at(-1) ?? null;

export default async function AdminAnalyticsPage() {
  await requireAdminSession();

  const [venueSubs, venueSubscribers, venueClicks, venueContents, hubSubmissions, hubSubscribers, blackbook, photoNights, pageViews, opex] =
    await Promise.all([
      Promise.all(VENUES.map((venue) => getContactSubmissionStats(venue))),
      Promise.all(VENUES.map((venue) => getSubscriberStats(venue))),
      Promise.all(VENUES.map((venue) => getMenuClickStats(venue))),
      Promise.all(VENUES.map((venue) => getDraftSiteContent(venue))),
      getHubContactStats().catch(() => ({ total: 0, last7Days: 0, last30Days: 0, mostRecent: null })),
      getHubSubscriberStats().catch(() => ({ total: 0, fromNewsletter: 0, fromContactForm: 0, fromTicketPurchase: 0, last30Days: 0 })),
      getBlackbookStats(),
      listNightsForAdmin().catch(() => []),
      getPageViewStats(),
      getOpexSummary(),
    ]);

  const submissions = {
    total: hubSubmissions.total + venueSubs.reduce((n, s) => n + s.total, 0),
    last7Days: hubSubmissions.last7Days + venueSubs.reduce((n, s) => n + s.last7Days, 0),
    last30Days: hubSubmissions.last30Days + venueSubs.reduce((n, s) => n + s.last30Days, 0),
    mostRecent: latest([hubSubmissions.mostRecent, ...venueSubs.map((s) => s.mostRecent)]),
  };
  const subscribers = {
    total: hubSubscribers.total + venueSubscribers.reduce((n, s) => n + s.total, 0),
    fromNewsletter: hubSubscribers.fromNewsletter + venueSubscribers.reduce((n, s) => n + s.fromNewsletter, 0),
    fromContactForm: hubSubscribers.fromContactForm + venueSubscribers.reduce((n, s) => n + s.fromContactForm, 0),
    last30Days: hubSubscribers.last30Days + venueSubscribers.reduce((n, s) => n + s.last30Days, 0),
  };

  // Friendly names for counted pages, venue-aware.
  const nightTitles = new Map(photoNights.map((n) => [n.path, n.title]));
  const BASE_LABELS: Record<string, string> = {
    "": "Home",
    "/menu": "Menu",
    "/calendar": "Calendar",
    "/visit": "Visit",
    "/story": "Story",
    "/contact": "Contact",
    "/careers": "Careers",
    "/private-events": "Book an event",
    "/reservations": "Reservations",
    "/contest": "Contest: enter",
    "/contest/vote": "Contest: vote",
    "/privacy": "Privacy",
    "/terms": "Terms",
    "/accessibility": "Accessibility",
  };
  const pageLabel = (page: string) => {
    for (const venue of VENUES) {
      if (page === venue.basePath || page.startsWith(`${venue.basePath}/`)) {
        const rest = page.slice(venue.basePath.length);
        return `${venue.name}: ${BASE_LABELS[rest] ?? rest}`;
      }
    }
    if (page === "/") return "Market home";
    if (page.startsWith("/photos/")) {
      const path = page.slice("/photos/".length);
      const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(path);
      const when = day
        ? new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
        : path;
      return `Photos: ${nightTitles.get(path) ?? when}`;
    }
    return BASE_LABELS[page] ?? page;
  };
  const viewRows = pageViews.rows.slice(0, 30);

  const clickTotal = (target: MenuClickTarget) => venueClicks.reduce((n, c) => n + c.totals[target], 0);
  const rankedTargets = [...MENU_CLICK_TARGETS].sort((a, b) => clickTotal(b) - clickTotal(a));

  const nowIso = new Date().toISOString().slice(0, 10);
  const allEvents = venueContents.flatMap((c) => c.calendar.events);
  const upcomingEvents = allEvents.filter((event) => event.date >= nowIso).length;

  return (
    <CollectiveShell layout="tool" title="Analytics">
      <section className="admin-analytics">
        <header className="admin-analytics-header">
          <h1>Analytics</h1>
          <p>One snapshot for the whole Market. Updated on every page load.</p>
        </header>

        <div className="admin-analytics-grid">
          {opex ? <OpexCard initial={opex} /> : null}

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
            {VENUES.map((venue) => (
              <a key={venue.slug} className="admin-analytics-link" href={`${venue.basePath}/admin/submissions`}>
                {venue.name} submissions →
              </a>
            ))}
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
            <a className="admin-analytics-link" href="/admin/api/master-list">
              Download master contact list →
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
            <h2>Photos</h2>
            <dl className="admin-stat-rows">
              <dt>Nights to review</dt>
              <dd>{formatNumber(photoNights.filter((n) => n.needsReview && !n.hidden).length)}</dd>
              <dt>Nights live</dt>
              <dd>{formatNumber(photoNights.filter((n) => n.published && !n.hidden).length)}</dd>
              <dt>Photos live</dt>
              <dd>{formatNumber(photoNights.filter((n) => n.published && !n.hidden).reduce((sum, n) => sum + n.liveCount, 0))}</dd>
            </dl>
            <a className="admin-analytics-link" href="/admin/photos">
              Review photos →
            </a>
          </article>

          <article className="admin-analytics-card">
            <h2>Calendars</h2>
            <dl className="admin-stat-rows">
              <dt>Upcoming events</dt>
              <dd>{formatNumber(upcomingEvents)}</dd>
              <dt>Past events</dt>
              <dd>{formatNumber(allEvents.length - upcomingEvents)}</dd>
              {VENUES.map((venue, index) => (
                <Fragment key={venue.slug}>
                  <dt>{venue.name}</dt>
                  <dd>{formatNumber(venueContents[index].calendar.events.length)}</dd>
                </Fragment>
              ))}
            </dl>
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Page Views</h2>
            <p className="admin-analytics-copy">
              Every time a guest opens a page of the site — the Market, each venue, each photo night. Admin and staff
              pages aren&apos;t counted, and neither are search-engine robots.
              {pageViews.since ? ` Counting since ${formatDate(pageViews.since)}.` : " Counting starts now."}
            </p>
            {viewRows.length ? (
              <div className="admin-table-scroll">
                <table className="admin-menu-clicks">
                  <thead>
                    <tr>
                      <th scope="col">Page</th>
                      <th scope="col">All-time</th>
                      <th scope="col">Last 30 days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRows.map((row) => (
                      <tr key={row.page}>
                        <th scope="row">{pageLabel(row.page)}</th>
                        <td>{formatNumber(row.total)}</td>
                        <td>{formatNumber(row.last30)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">All pages{pageViews.rows.length > viewRows.length ? ` (top ${viewRows.length} shown)` : ""}</th>
                      <td>{formatNumber(pageViews.total)}</td>
                      <td>{formatNumber(pageViews.last30)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="admin-photos-muted">No page views yet. They&apos;ll show up as guests visit.</p>
            )}
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Menu Clicks by Venue</h2>
            <p className="admin-analytics-copy">
              Every tap on a bottom-menu or drawer link, kept separate per venue. All-time, with the last 30 days in
              parentheses.
            </p>
            <div className="admin-table-scroll">
              <table className="admin-menu-clicks">
                <thead>
                  <tr>
                    <th scope="col">Destination</th>
                    {VENUES.map((venue) => (
                      <th key={venue.slug} scope="col">
                        {venue.name}
                      </th>
                    ))}
                    <th scope="col">All venues</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedTargets.map((target) => (
                    <tr key={target}>
                      <th scope="row">{MENU_TARGET_LABELS[target] ?? target}</th>
                      {venueClicks.map((clicks, index) => (
                        <td key={VENUES[index].slug}>
                          {formatNumber(clicks.totals[target])} <span className="admin-stat-muted">({formatNumber(clicks.last30[target])})</span>
                        </td>
                      ))}
                      <td>
                        {formatNumber(clickTotal(target))}{" "}
                        <span className="admin-stat-muted">({formatNumber(venueClicks.reduce((n, c) => n + c.last30[target], 0))})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Overall</th>
                    {venueClicks.map((clicks, index) => (
                      <td key={VENUES[index].slug}>
                        {formatNumber(clicks.overallTotal)} <span className="admin-stat-muted">({formatNumber(clicks.overallLast30)})</span>
                      </td>
                    ))}
                    <td>
                      {formatNumber(venueClicks.reduce((n, c) => n + c.overallTotal, 0))}{" "}
                      <span className="admin-stat-muted">({formatNumber(venueClicks.reduce((n, c) => n + c.overallLast30, 0))})</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </article>

          <article className="admin-analytics-card admin-analytics-card--wide">
            <h2>Traffic Analytics</h2>
            <p className="admin-analytics-copy">
              Referrers, devices and countries live in Vercel Analytics, our website host&apos;s own dashboard. It
              opens in a new tab.
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
    </CollectiveShell>
  );
}
