"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminNight, ContributorSummary } from "@/lib/photoStore";

const fmt = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }) : null;

function ReviewerCell({ label, reviewed, done, total }: { label: string; reviewed: number; done: boolean; total: number }) {
  return (
    <span className="admin-photos-reviewer">
      <em>{label}</em>
      {done && reviewed >= total ? (
        <span className="admin-photos-done">Done ✓</span>
      ) : reviewed === 0 ? (
        <span className="admin-photos-muted">Not started</span>
      ) : (
        <span>
          {reviewed} of {total}
        </span>
      )}
    </span>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; password?: string };
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function AdminPhotosView({
  nights,
  contributors,
  storageReady,
}: {
  nights: AdminNight[];
  contributors: ContributorSummary[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<{ who: string; email: string; password: string } | null>(null);
  const [error, setError] = useState("");

  const review = nights.filter((n) => n.needsReview && !n.hidden);
  const live = nights.filter((n) => n.published && !n.hidden && !n.needsReview);
  const hidden = nights.filter((n) => n.hidden);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const addContributor = () =>
    run(async () => {
      const data = await send("/admin/api/photos/contributors", "POST", { name, email });
      setNotice({ who: name.trim(), email: email.trim().toLowerCase(), password: data.password! });
      setName("");
      setEmail("");
    });

  const resetPassword = (c: ContributorSummary) =>
    run(async () => {
      const data = await send(`/admin/api/photos/contributors/${c.id}`, "PATCH", { resetPassword: true });
      setNotice({ who: c.name, email: c.email, password: data.password! });
    });

  const NightRow = ({ n }: { n: AdminNight }) => (
    <li>
      <div className={`admin-photos-row${n.needsReview ? "" : " admin-photos-row--live"}`}>
        <a className="admin-photos-night" href={`/admin/photos/${n.id}`}>
          <strong>{n.title}</strong>
          <span>
            {fmt(n.date)} · {n.published ? `${n.liveCount} of ${n.photos} photos live` : `${n.photos} photos`}
            {n.contributor ? ` · from ${n.contributor}` : ""}
          </span>
        </a>
        {n.needsReview ? (
          <>
            <ReviewerCell label="Review" reviewed={n.reviewed.cd} done={n.done.cd} total={n.photos} />
            <span className="admin-photos-action">
              <a href={`/admin/photos/${n.id}`}>Review →</a>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete ${n.title} (${fmt(n.date)}) and all ${n.photos} photos for good?`)) {
                    run(() => send(`/admin/api/photos/nights/${n.id}`, "DELETE"));
                  }
                }}
              >
                Delete
              </button>
            </span>
          </>
        ) : (
          <span className="admin-photos-live-links">
            {n.hidden ? null : (
              <a href={`/photos/${n.date}`} target="_blank" rel="noreferrer">
                View ↗
              </a>
            )}
            <a href={`/admin/photos/${n.id}`}>Edit</a>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Reopen review for ${n.title}? It comes off the site until the review is marked done again. Passes and fails are kept.`)) {
                  run(() => send(`/admin/api/photos/nights/${n.id}`, "POST", { action: "reopen" }));
                }
              }}
            >
              Reopen review
            </button>
            {n.hidden ? (
              <button type="button" onClick={() => run(() => send(`/admin/api/photos/nights/${n.id}`, "POST", { action: "show" }))}>
                Publish again
              </button>
            ) : (
              <button type="button" onClick={() => run(() => send(`/admin/api/photos/nights/${n.id}`, "POST", { action: "hide" }))}>
                Unpublish
              </button>
            )}
            {n.hidden ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete ${n.title} (${fmt(n.date)}) and all ${n.photos} photos for good?`)) {
                    run(() => send(`/admin/api/photos/nights/${n.id}`, "DELETE"));
                  }
                }}
              >
                Delete
              </button>
            ) : null}
          </span>
        )}
      </div>
    </li>
  );

  return (
    <section className="admin-mailing-list admin-photos">
      <a className="admin-back-link" href="/admin/analytics">
        <span aria-hidden="true">←</span> Analytics
      </a>
      <div className="admin-mailing-list-header">
        <h1>Photos</h1>
        <a className="admin-photos-events-link" href="/admin/photos/events">
          Photo Events <span aria-hidden="true">→</span>
        </a>
      </div>
      <p className="admin-mailing-list-note">
        Contributors upload each night&apos;s photos at fwpublicmarket.com/upload. A night goes live on the Visit page and
        the calendar once its review is marked done, showing only the photos that passed. The Creative Director and
        the Marketing Director share one review, so either of you can do it.
      </p>
      {!storageReady ? (
        <p className="admin-photos-warning">
          Photo storage isn&apos;t connected yet, so contributors can&apos;t upload. Add the R2 settings in Vercel to
          switch it on.
        </p>
      ) : null}
      {error ? <p className="admin-photos-warning">{error}</p> : null}

      <h2 className="admin-photos-section">
        Needs review <span>{review.length}</span>
      </h2>
      {review.length ? (
        <ul className="admin-photos-list">
          {review.map((n) => (
            <NightRow key={n.id} n={n} />
          ))}
        </ul>
      ) : (
        <p className="admin-photos-muted">Nothing waiting.</p>
      )}

      <h2 className="admin-photos-section">
        Live <span>{live.length}</span>
      </h2>
      {live.length ? (
        <ul className="admin-photos-list">
          {live.map((n) => (
            <NightRow key={n.id} n={n} />
          ))}
        </ul>
      ) : (
        <p className="admin-photos-muted">No nights live yet.</p>
      )}

      {hidden.length ? (
        <>
          <h2 className="admin-photos-section">
            Unpublished <span>{hidden.length}</span>
          </h2>
          <ul className="admin-photos-list">
            {hidden.map((n) => (
              <NightRow key={n.id} n={n} />
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="admin-photos-section">Upload logins</h2>
      <div className="admin-photos-contributors">
        {notice ? (
          <div className="admin-photos-password">
            <strong>Send these to {notice.who}. The password won&apos;t be shown again.</strong>
            <span>fwpublicmarket.com/upload</span>
            <span>Email: {notice.email}</span>
            <span>
              Password: <code>{notice.password}</code>
            </span>
            <button type="button" onClick={() => setNotice(null)}>
              Done
            </button>
          </div>
        ) : null}
        {contributors.length ? (
          <ul>
            {contributors.map((c) => (
              <li key={c.id} className={c.active ? undefined : "is-off"}>
                <span>
                  <strong>{c.name}</strong> · {c.email}
                </span>
                <span className="admin-photos-muted">
                  {c.active ? "" : "Turned off · "}
                  {c.nights} night{c.nights === 1 ? "" : "s"} uploaded
                  {c.lastUploadAt ? ` · last ${fmtDay(c.lastUploadAt)}` : ""}
                </span>
                <span className="admin-photos-contributor-actions">
                  <button type="button" onClick={() => resetPassword(c)}>
                    New password
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => send(`/admin/api/photos/contributors/${c.id}`, "PATCH", { active: !c.active }))}
                  >
                    {c.active ? "Turn off" : "Turn on"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-photos-muted">No upload logins yet.</p>
        )}
        <form
          className="admin-photos-add"
          onSubmit={(e) => {
            e.preventDefault();
            addContributor();
          }}
        >
          <input placeholder="Name" aria-label="Contributor name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Email" type="email" aria-label="Contributor email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Add contributor</button>
        </form>
        <p className="admin-photos-muted">
          Each contributor gets their own login at fwpublicmarket.com/upload. They can only upload photos for a night. They
          can&apos;t see admin, reviews, or anyone else&apos;s uploads.
        </p>
      </div>
    </section>
  );
}
