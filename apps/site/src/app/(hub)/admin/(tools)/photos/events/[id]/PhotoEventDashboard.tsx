"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminEntry, ContestDashboard } from "@/lib/contestStore";
import { clockLabel, contestFormFrom, dayLabel, phaseOf } from "@/lib/contestShared";
import { postJson } from "@/lib/photoClient";
import PhotoEventForm from "../PhotoEventForm";

type Props = { initial: ContestDashboard; checkReady: boolean };

export default function PhotoEventDashboard({ initial, checkReady }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { contest, totals } = data;
  const id = contest.id;

  // Phases from the live clock, not from when the page loaded.
  const [now, setNow] = useState(() => Date.now());
  const uploads = phaseOf(contest.uploadOpensAt, contest.uploadClosesAt, now);
  const voting = phaseOf(contest.voteOpensAt, contest.voteClosesAt, now);
  const running = uploads === "open" || voting === "open";

  const refresh = useCallback(async () => {
    const res = await fetch(`/admin/api/contests/${id}`, { cache: "no-store" });
    if (res.ok) setData((await res.json()) as ContestDashboard);
    setNow(Date.now());
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, running ? 8000 : 30000);
    return () => window.clearInterval(timer);
  }, [refresh, running]);

  const act = async (action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return null;
    setBusy(`${action}:${extra.entryId ?? ""}`);
    setMessage("");
    try {
      const result = await postJson<Record<string, unknown>>(`/admin/api/contests/${id}`, { action, ...extra });
      await refresh();
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That didn't work.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const [contestUrl, setContestUrl] = useState("fwpublicmarket.com/contest");
  useEffect(() => setContestUrl(`${window.location.host.replace(/^www\./, "")}/contest`), []);
  const statusLine =
    voting === "after"
      ? `Voting closed at ${clockLabel(contest.voteClosesAt)}`
      : `Entries ${uploads === "open" ? "open until" : uploads === "before" ? "open at" : "closed at"} ${clockLabel(uploads === "before" ? contest.uploadOpensAt : contest.uploadClosesAt)} · voting ${voting === "open" ? "closes" : "opens"} ${clockLabel(voting === "open" ? contest.voteClosesAt : contest.voteOpensAt)} · counts hidden from guests until then`;

  const entryRow = (entry: AdminEntry, held: boolean) => (
    <li key={entry.id}>
      <button
        type="button"
        className="admin-pe-thumb"
        onClick={() => setRevealed((r) => new Set(r).add(entry.id))}
        aria-label={held && !revealed.has(entry.id) ? "Tap to show photo" : "Open photo"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entry.thumb} alt="" className={held && !revealed.has(entry.id) ? "is-blurred" : undefined} />
      </button>
      <div>
        <strong>
          #{entry.number} · {entry.name}
          {entry.costume ? ` · ${entry.costume}` : ""}
        </strong>
        {held ? (
          <span>{entry.reason ?? "Held"}</span>
        ) : (
          <>
            {entry.wins.length ? <b className="admin-pe-win">Winner: {entry.wins.join(" & ")}</b> : null}
            <em>
              {entry.total} vote{entry.total === 1 ? "" : "s"}
              {contest.categories.length > 1 && entry.total
                ? ` (${contest.categories
                    .filter((c) => entry.votes[c.id])
                    .map((c) => `${c.name} ${entry.votes[c.id]}`)
                    .join(" · ")})`
                : ""}
              {entry.reports ? ` · ${entry.reports} report${entry.reports === 1 ? "" : "s"}` : ""}
            </em>
          </>
        )}
        {revealed.has(entry.id) ? (
          <a href={entry.view} target="_blank" rel="noreferrer">
            Full photo
          </a>
        ) : null}
      </div>
      {held ? (
        <button type="button" onClick={() => act("approve", { entryId: entry.id })} disabled={busy !== null}>
          Approve
        </button>
      ) : (
        <button type="button" className="is-quiet" onClick={() => act("hide", { entryId: entry.id })} disabled={busy !== null}>
          Hide
        </button>
      )}
      <button
        type="button"
        className="is-danger"
        onClick={() => act("remove", { entryId: entry.id }, `Remove ${entry.name}'s entry for good? The photo is deleted and their voters can vote again.`)}
        disabled={busy !== null}
      >
        Remove
      </button>
    </li>
  );

  return (
    <section className="admin-mailing-list admin-photos">
      <a className="admin-back-link" href="/admin/photos/events">
        <span aria-hidden="true">←</span> Photo Events
      </a>
      <div className="admin-mailing-list-header">
        <h1>{contest.title}</h1>
      </div>
      <p className="admin-mailing-list-note">
        {dayLabel(contest.date)} · {statusLine}
      </p>
      {!checkReady && contest.moderation === "auto" ? (
        <p className="admin-photos-warning">
          Automatic photo check is off (no ANTHROPIC_API_KEY in Vercel), so every entry waits here for Approve.
        </p>
      ) : null}
      {message ? (
        <p className="admin-photos-warning" role="alert">
          {message}
        </p>
      ) : null}

      <dl className="admin-customers-totals">
        <div>
          <dt>Entries</dt>
          <dd>{totals.entries}</dd>
        </div>
        <div>
          <dt>Live</dt>
          <dd>{totals.live}</dd>
        </div>
        <div>
          <dt>Held</dt>
          <dd>{totals.held}</dd>
        </div>
        <div>
          <dt>Votes</dt>
          <dd>
            {totals.votes}
            {contest.categories.length > 1 ? <small> from {totals.voters} phones</small> : null}
            {totals.voided ? <small> ({totals.voided} voided)</small> : null}
          </dd>
        </div>
      </dl>

      {data.bursts.map((burst) => (
        <div className="admin-pe-alert" key={`${burst.ip}-${burst.entryId}-${burst.categoryId}-${burst.from}`}>
          <span>
            <strong>Unusual voting:</strong> {burst.votes} {burst.category} votes for &ldquo;{burst.entry}&rdquo; from one connection in 5
            minutes (around {clockLabel(burst.from)}). Could be a table on the bar Wi-Fi, or one person clearing their
            phone to vote again.
          </span>
          <button
            type="button"
            onClick={() => act("void", { entryId: burst.entryId, categoryId: burst.categoryId, ip: burst.ip, from: burst.from }, `Void these ${burst.votes} votes?`)}
            disabled={busy !== null}
          >
            Void those votes
          </button>
        </div>
      ))}

      <h2 className="admin-photos-section">
        Held for review <span className={Number(data.held.length) ? undefined : "is-zero"}>{data.held.length}</span>
      </h2>
      {data.held.length ? (
        <ul className="admin-pe-held">{data.held.map((entry) => entryRow(entry, true))}</ul>
      ) : (
        <p className="admin-pe-empty">Nothing waiting. Flagged or reported photos show up here, blurred.</p>
      )}

      <h2 className="admin-photos-section">{voting === "after" ? "Winners" : "Winning right now (staff only)"}</h2>
      <ul className="admin-pe-winners">
        {data.winners.map((w) => {
          const entry = data.live.find((e) => e.id === w.entryId);
          return (
            <li key={w.category.id}>
              <span>{w.category.name}</span>
              {entry ? (
                <strong>
                  #{entry.number} · {entry.name}
                  {entry.costume ? ` · ${entry.costume}` : ""} · {w.votes} vote{w.votes === 1 ? "" : "s"}
                  {w.tied ? <small> (tied; the earlier entry gets it)</small> : null}
                </strong>
              ) : (
                <em>No votes yet</em>
              )}
            </li>
          );
        })}
      </ul>
      {contest.categories.length > 1 ? (
        <p className="admin-pe-hint">
          {contest.onePrizeEach
            ? "One prize per costume: a costume that tops several categories keeps the first, and the next one down gets the rest."
            : "A costume can win more than one category."}
        </p>
      ) : null}

      <h2 className="admin-photos-section">
        {voting === "after" ? "All entries" : "Leaderboard (staff only)"} <span className={Number(data.live.length) ? undefined : "is-zero"}>{data.live.length}</span>
      </h2>
      {data.live.length ? (
        <ol className="admin-pe-leaders">{data.live.map((entry) => entryRow(entry, false))}</ol>
      ) : (
        <p className="admin-pe-empty">No live entries yet.</p>
      )}

      <div className="admin-pe-qr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="admin-pe-qr-code" src="/admin/api/contests/qr" alt="QR code for the contest page" />
        <div>
          <strong>{contestUrl}</strong>
          <span>One QR for every photo event: it always opens whichever one is on. Print it for the bar and tables.</span>
          <div className="admin-pe-qr-actions">
            <a href="/admin/api/contests/qr?download=1">Download QR</a>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`https://${contestUrl}`).catch(() => {});
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href="/contest" target="_blank" rel="noreferrer">
              Open guest page
            </a>
          </div>
        </div>
      </div>

      <div className="admin-pe-actions admin-pe-bar">
        {voting !== "after" ? (
          <button
            type="button"
            className="is-danger"
            onClick={() => act("close", {}, "Close entries and voting now? Guests will see the results.")}
            disabled={busy !== null}
          >
            Close voting now
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              const result = await act(
                "move",
                {},
                contest.nightId
                  ? "Update the Market Nights block with the latest entries and captions?"
                  : `Move all ${data.live.length} live entries into Market Nights as "${contest.title}"? They go through the usual two-director review before showing.`,
              );
              if (result?.nightId) router.push(`/admin/photos/${result.nightId as string}`);
            }}
            disabled={busy !== null || data.live.length === 0}
          >
            {contest.nightId ? "Update Market Nights" : "Move to Market Nights"}
          </button>
        )}
        {contest.nightId ? <a href={`/admin/photos/${contest.nightId}`}>Open its review →</a> : null}
        <button type="button" className="is-quiet" onClick={() => setEditing((e) => !e)}>
          {editing ? "Cancel edit" : "Edit times"}
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={async () => {
            if (!window.confirm(`Delete "${contest.title}" and all its entries and votes? This can't be undone.`)) return;
            const res = await fetch(`/admin/api/contests/${id}`, { method: "DELETE" });
            if (res.ok) router.push("/admin/photos/events");
          }}
          disabled={busy !== null}
        >
          Delete event
        </button>
      </div>

      {editing ? (
        <PhotoEventForm
          initial={contestFormFrom(contest)}
          submitLabel="Save changes"
          dateLocked={totals.entries > 0}
          onSubmit={async (form) => {
            try {
              await postJson(`/admin/api/contests/${id}`, { action: "update", form });
              await refresh();
              setEditing(false);
              return null;
            } catch (error) {
              return error instanceof Error ? error.message : "Couldn't save.";
            }
          }}
        />
      ) : null}
    </section>
  );
}
