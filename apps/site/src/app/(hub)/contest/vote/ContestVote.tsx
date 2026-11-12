"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryWinner, Contest, VoteEntry } from "@/lib/contestStore";
import { clockLabel, whenLabel } from "@/lib/contestShared";
import { postJson } from "@/lib/photoClient";
import { rememberDevice, storedDevice, useContestClock } from "../useContestClock";

type Props = { contest: Contest | null; entries: VoteEntry[]; winners: CategoryWinner[]; myVotes: Record<string, string> };

export default function ContestVote({ contest, entries, winners, myVotes: initialVotes }: Props) {
  useContestClock(contest);
  const router = useRouter();
  const categories = contest?.categories ?? [];
  const [myVotes, setMyVotes] = useState(initialVotes);
  const [active, setActive] = useState(() => categories.find((c) => !initialVotes[c.id])?.id ?? categories[0]?.id ?? "");
  const [confirm, setConfirm] = useState<VoteEntry | null>(null);
  const [viewing, setViewing] = useState<VoteEntry | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const open = contest?.voting === "open";
  const closed = contest?.voting === "after";
  const several = categories.length > 1;
  const category = categories.find((c) => c.id === active) ?? categories[0];

  useEffect(() => {
    if (!contest) return;
    postJson<{ votes?: Record<string, string>; device: string | null }>("/contest/api/me", { contestId: contest.id, device: storedDevice() })
      .then((data) => {
        rememberDevice(data.device);
        if (data.votes && Object.keys(data.votes).length) {
          setMyVotes((current) => ({ ...data.votes, ...current }));
          setActive((current) => (data.votes![current] ? (categories.find((c) => !data.votes![c.id])?.id ?? current) : current));
        }
      })
      .catch(() => {});
  }, [contest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // New entries keep arriving while voting is open.
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [open, router]);

  useEffect(() => {
    if (!confirm && !viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirm(null);
        setViewing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, viewing]);

  if (!contest || !category) {
    return (
      <section className="contest contest--center">
        <p className="contest-kicker">The Public Market</p>
        <h1>No contest right now</h1>
        <a className="contest-submit" href="/calendar">See what&apos;s on →</a>
      </section>
    );
  }

  const vote = async (entry: VoteEntry) => {
    setBusy(true);
    setMessage("");
    const categoryId = category.id;
    try {
      const res = await fetch("/contest/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestId: contest.id, entryId: entry.id, categoryId, device: storedDevice() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; entryId?: string | null; device?: string };
      rememberDevice(data.device);
      if (data.entryId) {
        const next = { ...myVotes, [categoryId]: data.entryId };
        setMyVotes(next);
        // On to the next prize still to vote on.
        const after = categories.find((c) => !next[c.id]);
        if (after && res.ok) {
          setActive(after.id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      if (!res.ok) setMessage(data.error || "Couldn't count that vote. Try again.");
    } catch {
      setMessage("Couldn't reach us. Check your connection and try again.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const report = async (entry: VoteEntry) => {
    if (!window.confirm(`Report ${entry.name}'s photo as inappropriate? Staff will take a look.`)) return;
    setReported((current) => new Set(current).add(entry.id));
    await postJson<{ device?: string }>("/contest/api/report", { entryId: entry.id, device: storedDevice() })
      .then((data) => rememberDevice(data.device))
      .catch(() => {});
  };

  const done = categories.filter((c) => myVotes[c.id]).length;
  const pickedHere = entries.find((e) => e.id === myVotes[category.id]) ?? null;
  const pickedFor = (entryId: string) => categories.filter((c) => myVotes[c.id] === entryId && c.id !== category.id).map((c) => c.name);
  const totalVotes = entries.reduce((n, e) => n + (e.total ?? 0), 0);
  const status = open
    ? `● Voting closes ${clockLabel(contest.voteClosesAt)}`
    : closed
      ? "Voting closed"
      : `Voting opens ${whenLabel(contest.voteOpensAt)} at ${clockLabel(contest.voteOpensAt)}`;

  const intro = closed
    ? `${totalVotes} vote${totalVotes === 1 ? "" : "s"}. Thanks for coming out!`
    : !open
      ? "Check out the costumes. Voting opens soon."
      : several
        ? done === categories.length
          ? `You've voted in all ${categories.length} categories. Votes are final. Winners at ${clockLabel(contest.voteClosesAt)}.`
          : `Vote once in each category (${done} of ${categories.length} done). Votes are final, and results show when voting closes.`
        : pickedHere
          ? `You voted for ${pickedHere.name}${pickedHere.costume ? ` (${pickedHere.costume})` : ""}. Votes are final. Results at ${clockLabel(contest.voteClosesAt)}.`
          : "You get one vote, and it's final. Results show when voting closes.";

  const winnerEntries = winners
    .map((w) => ({ winner: w, entry: entries.find((e) => e.id === w.entryId) ?? null }))
    .filter((w): w is { winner: CategoryWinner; entry: VoteEntry } => Boolean(w.entry));

  return (
    <section className="contest">
      <div className="contest-top">
        <a className="contest-back" href="/contest">
          ← {contest.uploads === "open" ? "Enter" : contest.title}
        </a>
        <span className="contest-live">{status}</span>
      </div>
      <p className="contest-kicker">{contest.title}</p>
      <h1>{closed ? (several ? "The winners" : "The results") : several ? "Vote in each category" : "Vote for your favorite"}</h1>
      <p className="contest-copy">{intro}</p>
      {message ? (
        <p className="contest-error" role="alert">
          {message}
        </p>
      ) : null}

      {closed && winnerEntries.length ? (
        <ul className="contest-winners">
          {winnerEntries.map(({ winner, entry }) => (
            <li key={winner.category.id}>
              <button type="button" className="contest-entry-photo" onClick={() => setViewing(entry)} aria-label={`See ${entry.name}'s costume`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.thumb} alt="" />
              </button>
              <div>
                <span className="contest-winner-prize">🏆 {winner.category.name}</span>
                <strong>{entry.name}</strong>
                {entry.costume ? <span>{entry.costume}</span> : null}
                <em>
                  {winner.votes} vote{winner.votes === 1 ? "" : "s"}
                </em>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!closed && several ? (
        <div className="contest-tabs" role="tablist" aria-label="Categories">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === category.id}
              className={`${c.id === category.id ? "is-active" : ""}${myVotes[c.id] ? " is-done" : ""}`.trim() || undefined}
              onClick={() => setActive(c.id)}
            >
              {myVotes[c.id] ? "✓ " : ""}
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {closed && entries.length ? <h2 className="contest-section">All the costumes</h2> : null}
      {entries.length === 0 ? (
        <div className="contest-closed">
          <strong>No entries yet</strong>
          <span>{contest.uploads === "open" ? "Be the first: enter your costume." : "Check back soon."}</span>
        </div>
      ) : (
        <ul className={`contest-grid${closed ? " contest-grid--results" : ""}`}>
          {entries.map((entry) => {
            const mine = myVotes[category.id] === entry.id;
            const elsewhere = closed ? [] : pickedFor(entry.id);
            const won = closed && entry.wins.length > 0;
            return (
              <li key={entry.id} className={`${mine && !closed ? "is-voted" : ""}${won ? " is-place-1" : ""}`.trim() || undefined}>
                <button type="button" className="contest-entry-photo" onClick={() => setViewing(entry)} aria-label={`See ${entry.name}'s costume`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.thumb} alt="" loading="lazy" />
                </button>
                {won ? <span className="contest-place">🏆 {entry.wins.join(" & ")}</span> : null}
                <div className="contest-entry-body">
                  <strong>{entry.name}</strong>
                  {entry.costume ? <span>{entry.costume}</span> : null}
                  {elsewhere.length ? <span className="contest-entry-picked">Your {elsewhere.join(", ")} pick</span> : null}
                </div>
                {closed ? (
                  <p className="contest-entry-votes">
                    {entry.total} vote{entry.total === 1 ? "" : "s"}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="contest-entry-vote"
                    disabled={!open || Boolean(myVotes[category.id]) || busy}
                    onClick={() => setConfirm(entry)}
                  >
                    {mine ? (several ? `✓ Your ${category.name} pick` : "✓ Your vote") : several ? `Vote ${category.name}` : "Vote"}
                  </button>
                )}
                {!closed ? (
                  <button
                    type="button"
                    className="contest-report"
                    onClick={() => report(entry)}
                    disabled={reported.has(entry.id)}
                    aria-label={`Report ${entry.name}'s photo`}
                  >
                    {reported.has(entry.id) ? "Reported" : "Report"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {confirm ? (
        <div className="contest-dialog" role="dialog" aria-modal="true" aria-label="Confirm your vote" onClick={() => setConfirm(null)}>
          <div className="contest-dialog-panel" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={confirm.thumb} alt="" />
            <p>
              Vote for <strong>{confirm.name}</strong>
              {confirm.costume ? <> as {confirm.costume}</> : null}
              {several ? (
                <>
                  {" "}
                  for <strong>{category.name}</strong>
                </>
              ) : null}
              ?
            </p>
            <p className="contest-fine">Your vote is final. You can&apos;t change it.</p>
            <div className="contest-dialog-actions">
              <button type="button" className="contest-dialog-cancel" onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="contest-submit" onClick={() => vote(confirm)} disabled={busy}>
                {busy ? "Voting…" : "Lock in my vote"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="contest-viewer" role="dialog" aria-modal="true" aria-label={`${viewing.name}'s costume`} onClick={() => setViewing(null)}>
          <button type="button" className="contest-viewer-close" aria-label="Close">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing.view} alt="" />
          <p>
            <strong>{viewing.name}</strong>
            {viewing.costume ? <> · {viewing.costume}</> : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
