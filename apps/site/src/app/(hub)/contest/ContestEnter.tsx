"use client";

import { useEffect, useRef, useState } from "react";
import type { Contest, MyEntry } from "@/lib/contestStore";
import { clockLabel, dayLabel, whenLabel } from "@/lib/contestShared";
import { makeCopies, postJson, putFile } from "@/lib/photoClient";
import { rememberDevice, storedDevice, useContestClock } from "./useContestClock";

type Props = { contest: Contest | null; mine: MyEntry | null; storageReady: boolean };
type Stage = "form" | "uploading" | "checking" | "done";

// Phone photos get the same three copies as a night's photos, a bit
// smaller: they're uploaded over bar Wi-Fi.
const SIZES = { full: 3000, view: 2048, thumb: 800 };

export default function ContestEnter({ contest, mine: initialMine, storageReady }: Props) {
  useContestClock(contest);
  const [mine, setMine] = useState(initialMine);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [costume, setCostume] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick up an entry this phone made even if its cookie was cleared.
  useEffect(() => {
    if (!contest) return;
    postJson<{ entry: MyEntry | null; device: string | null }>("/contest/api/me", { contestId: contest.id, device: storedDevice() })
      .then((data) => {
        rememberDevice(data.device);
        if (data.entry) setMine(data.entry);
      })
      .catch(() => {});
  }, [contest]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!contest) {
    return (
      <section className="contest contest--center">
        <p className="contest-kicker">The Public Market</p>
        <h1>No contest right now</h1>
        <p className="contest-copy">When there&apos;s a costume contest or photo event, it&apos;ll be right here.</p>
        <a className="contest-submit" href="/calendar">See what&apos;s on →</a>
      </section>
    );
  }

  const kicker = `${contest.title} · ${dayLabel(contest.date)}`;
  const voteLink =
    contest.voting === "open" ? (
      <a className="contest-vote-btn" href="/contest/vote">Vote →</a>
    ) : contest.voting === "after" ? (
      <a className="contest-vote-btn" href="/contest/vote">Results →</a>
    ) : null;
  const status =
    contest.uploads === "open"
      ? `● Entries open until ${clockLabel(contest.uploadClosesAt)}`
      : contest.voting === "open"
        ? `● Voting until ${clockLabel(contest.voteClosesAt)}`
        : null;

  const pick = (list: FileList | null) => {
    const chosen = list?.[0];
    if (!chosen) return;
    if (!/^image\//.test(chosen.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(chosen.name)) {
      setError("That isn't a photo. Pick a photo instead.");
      return;
    }
    setError("");
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return setError("Add a photo of your costume.");
    if (!name.trim()) return setError("Add your name.");
    if (!consent) return setError("Tick the box to say the photo is OK to show.");
    setError("");
    setStage("uploading");
    setProgress(0);
    try {
      const copies = await makeCopies(file, SIZES).catch(() => {
        throw new Error("Couldn't read that photo. Try a different one, or take a new one.");
      });
      const start = await postJson<{ id: string; number: number; device: string; uploads: Record<"full" | "view" | "thumb", string>; downloadName: string }>(
        "/contest/api/entries",
        { contestId: contest.id, name: name.trim(), costume: costume.trim(), consent, width: copies.width, height: copies.height, device: storedDevice() },
      );
      rememberDevice(start.device);
      const total = copies.blobs.full.size + copies.blobs.view.size + copies.blobs.thumb.size;
      const sent = { full: 0, view: 0, thumb: 0 };
      const report = () => setProgress(Math.round(((sent.full + sent.view + sent.thumb) / total) * 100));
      const cache = "public, max-age=31536000, immutable";
      const put = async (size: "full" | "view" | "thumb", headers: Record<string, string>) => {
        for (let attempt = 0; ; attempt++) {
          try {
            return await putFile(start.uploads[size], copies.blobs[size], { "Content-Type": "image/jpeg", "Cache-Control": cache, ...headers }, (n) => {
              sent[size] = n;
              report();
            });
          } catch (error) {
            if (attempt >= 2) throw error;
          }
        }
      };
      await Promise.all([
        put("full", { "Content-Disposition": `attachment; filename="${start.downloadName}"` }),
        put("view", {}),
        put("thumb", {}),
      ]);
      setStage("checking");
      const done = await postJson<{ number: number; status: "live" | "held" }>(`/contest/api/entries/${start.id}/complete`, { device: storedDevice() });
      setMine({ id: start.id, number: done.number, name: name.trim(), costume: costume.trim(), status: done.status, thumb: preview ?? "" });
      setStage("done");
    } catch (err) {
      setStage("form");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (mine) {
    const note =
      mine.status === "live"
        ? "Your costume is up on the vote page. Tell your friends."
        : mine.status === "held"
          ? "Staff are taking a quick look at your photo. It shows on the vote page once it's approved."
          : "Staff took this entry down.";
    return (
      <section className="contest contest--center">
        <p className="contest-kicker">{kicker}</p>
        <h1>{mine.status === "removed" ? "Entry removed" : "You're in!"}</h1>
        {mine.status !== "removed" && mine.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="contest-done-photo" src={mine.thumb} alt="" />
        ) : null}
        <p className="contest-copy">
          Entry <strong>#{mine.number} · {mine.name}</strong>
          {mine.costume ? <> as {mine.costume}</> : null}. {note}
        </p>
        {contest.voting !== "before" ? (
          <a className="contest-submit" href="/contest/vote">
            {contest.voting === "after" ? "See the results →" : "Go vote →"}
          </a>
        ) : (
          <p className="contest-fine">Voting opens {whenLabel(contest.voteOpensAt)} at {clockLabel(contest.voteOpensAt)}.</p>
        )}
      </section>
    );
  }

  if (contest.uploads !== "open") {
    return (
      <section className="contest contest--center">
        <p className="contest-kicker">{kicker}</p>
        <h1>{contest.title}</h1>
        <div className="contest-closed">
          {contest.uploads === "before" ? (
            <>
              <strong>
                Entries open {whenLabel(contest.uploadOpensAt)} at {clockLabel(contest.uploadOpensAt)}
              </strong>
              <span>
                Come back in costume and enter from your phone. Voting runs until {clockLabel(contest.voteClosesAt)}.
              </span>
            </>
          ) : (
            <>
              <strong>Entries are closed</strong>
              <span>
                {contest.voting === "open"
                  ? `Voting is open until ${clockLabel(contest.voteClosesAt)}.`
                  : contest.voting === "after"
                    ? "Voting is over. Thanks for coming out!"
                    : `Voting opens at ${clockLabel(contest.voteOpensAt)}.`}
              </span>
            </>
          )}
        </div>
        {voteLink}
      </section>
    );
  }

  const busy = stage !== "form";
  return (
    <section className="contest">
      <div className="contest-top">
        <span className="contest-live">{status}</span>
        {voteLink}
      </div>
      <p className="contest-kicker">{kicker}</p>
      <h1>{contest.title}</h1>
      <p className="contest-copy">
        Enter your costume, then everyone votes. Voting closes at {clockLabel(contest.voteClosesAt)}.
      </p>

      {!storageReady ? (
        <div className="contest-closed">
          <strong>Entries aren&apos;t switched on yet</strong>
          <span>Ask the bar.</span>
        </div>
      ) : (
        <form className="contest-form" onSubmit={submit} noValidate>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
          {preview ? (
            <button type="button" className="contest-photo" onClick={() => inputRef.current?.click()} disabled={busy}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your photo" />
              <span className="contest-photo-change">Change photo</span>
            </button>
          ) : (
            <button type="button" className="contest-photo contest-photo--empty" onClick={() => inputRef.current?.click()} disabled={busy}>
              <span className="contest-photo-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4Z" />
                  <circle cx="12" cy="13.2" r="3.4" />
                </svg>
              </span>
              <strong>Add your costume photo</strong>
              <span>Take one now or pick from your photos</span>
            </button>
          )}
          <label className="contest-field">
            <span>Your name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" disabled={busy} required />
          </label>
          <label className="contest-field">
            <span>Costume (optional)</span>
            <input value={costume} onChange={(e) => setCostume(e.target.value)} maxLength={60} placeholder="e.g. The Bride of Frankenstein" disabled={busy} />
          </label>
          <label className="contest-check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} />
            <span>This is me, or I have their OK. The Public Market can show it on the vote page and its socials.</span>
          </label>
          {error ? (
            <p className="contest-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="contest-submit" disabled={busy}>
            {stage === "uploading" ? `Uploading… ${progress}%` : stage === "checking" ? "Checking your photo…" : "Enter the contest"}
          </button>
          <p className="contest-fine">One entry per phone. Photos are checked before they appear.</p>
        </form>
      )}
    </section>
  );
}
