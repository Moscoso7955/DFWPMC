"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SHARED_REVIEW, isShown, type Mark } from "@/lib/photoShared";
import type { ReviewNight, ReviewPhoto } from "@/lib/photoStore";
import SwipeReview from "./SwipeReview";

type Filter = "all" | "todo" | "pass" | "fail" | "star";
// One shared review: whoever is reviewing sets the same marks.
const reviewer = SHARED_REVIEW;

async function patch(url: string, body: unknown) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Couldn't save.");
}

export default function ReviewClient({ night }: { night: ReviewNight }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<ReviewPhoto[]>(night.photosList);
  const [filter, setFilter] = useState<Filter>("all");
  const [codeQuery, setCodeQuery] = useState("");
  const [swiping, setSwiping] = useState(false);
  const autoOpened = useRef(false);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // On phones, go straight to one-at-a-time review.
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    const phone = window.matchMedia("(max-width: 760px)").matches;
    if (phone && photos.some((p) => !p.marks[reviewer])) setSwiping(true);
  }, [photos]);

  const shown = useMemo(() => {
    const code = codeQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const byCode = code ? photos.filter((p) => p.code.includes(code)) : photos;
    return byCode.filter((p) => {
      if (filter === "todo") return !p.marks[reviewer];
      if (filter === "pass") return p.marks[reviewer] === "pass";
      if (filter === "fail") return p.marks[reviewer] === "fail";
      if (filter === "star") return p.stars[reviewer];
      return true;
    });
  }, [photos, filter, codeQuery]);

  const counts = useMemo(() => {
    return {
      todo: photos.filter((p) => !p.marks[reviewer]).length,
      pass: photos.filter((p) => p.marks[reviewer] === "pass").length,
      fail: photos.filter((p) => p.marks[reviewer] === "fail").length,
      star: photos.filter((p) => p.stars[reviewer]).length,
    };
  }, [photos]);

  const save = useCallback(
    async (photo: ReviewPhoto, change: { mark?: Mark | null; star?: boolean }) => {
      // Apply to the photo's latest state (two quick saves, e.g. pass then
      // star, must not overwrite each other), and undo just this field on failure.
      const apply = (p: ReviewPhoto, value: { mark?: Mark | null; star?: boolean }): ReviewPhoto =>
        value.mark !== undefined
          ? { ...p, marks: { ...p.marks, [reviewer]: value.mark } }
          : { ...p, stars: { ...p.stars, [reviewer]: Boolean(value.star) } };
      const previous = change.mark !== undefined ? { mark: photo.marks[reviewer] } : { star: photo.stars[reviewer] };
      setPhotos((list) => list.map((p) => (p.id === photo.id ? apply(p, change) : p)));
      try {
        await patch(`/admin/api/photos/items/${photo.id}`, change);
        setError("");
      } catch (e) {
        setPhotos((list) => list.map((p) => (p.id === photo.id ? apply(p, previous) : p)));
        setError(e instanceof Error ? e.message : "Couldn't save.");
      }
    },
    [],
  );

  // A highlight is a yes: starring also passes the photo (un-starring
  // leaves the yes/no alone).
  const toggleStar = useCallback(
    (photo: ReviewPhoto) => {
      const on = !photo.stars[reviewer];
      void save(photo, { star: on });
      if (on && photo.marks[reviewer] !== "pass") void save(photo, { mark: "pass" });
    },
    [save],
  );

  const mark = useCallback(
    (photo: ReviewPhoto, value: Mark) => save(photo, { mark: photo.marks[reviewer] === value ? null : value }),
    [save],
  );

  // Keyboard review in the large view: P pass, F fail, S star, arrows move.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      const photo = shown[open];
      if (!photo) return;
      const k = e.key.toLowerCase();
      if (k === "escape") setOpen(null);
      else if (k === "arrowright") setOpen(Math.min(shown.length - 1, open + 1));
      else if (k === "arrowleft") setOpen(Math.max(0, open - 1));
      else if (k === "p" || k === "f") {
        const value: Mark = k === "p" ? "pass" : "fail";
        void save(photo, { mark: value });
        if (filter === "all" || filter === (value === "pass" ? "pass" : "fail")) setOpen(Math.min(shown.length - 1, open + 1));
      } else if (k === "s") toggleStar(photo);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown, save, filter, toggleStar]);

  useEffect(() => {
    if (open !== null && open >= shown.length) setOpen(shown.length ? shown.length - 1 : null);
  }, [open, shown.length]);

  const setDone = async (done: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/admin/api/photos/nights/${night.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: done ? "done" : "undone" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; published?: boolean };
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const failedCount = photos.filter((p) => p.marks[reviewer] === "fail").length;

  const nightAction = async (body: object | null, confirmText: string, after: (data: { nightDeleted?: boolean }) => void) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/admin/api/photos/nights/${night.id}`, {
        method: body ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; nightDeleted?: boolean };
      if (!res.ok) throw new Error(data.error || "Couldn't delete.");
      after(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete.");
    } finally {
      setBusy(false);
    }
  };

  const deleteFailed = () =>
    nightAction(
      { action: "deleteFailed" },
      failedCount === photos.length
        ? `Every photo in this night was failed. Delete all ${failedCount} and the night itself? This can't be undone.`
        : `Delete the ${failedCount} failed photo${failedCount === 1 ? "" : "s"}? This can't be undone.`,
      (data) => {
        // Every photo was failed: the night is gone, so head back to the list.
        if (data.nightDeleted) {
          window.location.href = "/admin/photos";
          return;
        }
        setPhotos((list) => list.filter((p) => p.marks[reviewer] !== "fail"));
        router.refresh();
      },
    );

  const deleteWholeNight = () =>
    nightAction(null, `Delete ${night.title} and all ${photos.length} photos for good? This can't be undone.`, () => {
      window.location.href = "/admin/photos";
    });

  const whenLabel = new Date(`${night.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const mineDone = night.done[reviewer];
  const current = open !== null ? shown[open] : null;

  return (
    <section className="admin-mailing-list admin-photos admin-photo-review">
      <a className="admin-back-link" href="/admin/photos">
        <span aria-hidden="true">←</span> Photos
      </a>
      <div className="admin-mailing-list-header">
        <h1>{night.title}</h1>
      </div>
      <p className="admin-mailing-list-note">
        {whenLabel} · {photos.length} photos{night.contributor ? ` · uploaded by ${night.contributor}` : ""}
        {night.published ? (night.hidden ? " · unpublished" : ` · live with ${photos.filter((p) => isShown(p.marks)).length} photos`) : ""}
      </p>

      <div className="admin-review-manage">
        <button type="button" onClick={deleteFailed} disabled={busy || failedCount === 0}>
          Delete {failedCount} failed photo{failedCount === 1 ? "" : "s"}
        </button>
        <button type="button" onClick={deleteWholeNight} disabled={busy}>
          Delete this night
        </button>
      </div>

      <button type="button" className="admin-review-start" onClick={() => setSwiping(true)}>
        {counts.todo > 0 ? `Start reviewing · ${counts.todo} left` : "Review again, one at a time"}
      </button>

      <div className="admin-review-filters" role="tablist">
        {(
          [
            ["all", `All ${photos.length}`],
            ["todo", `Not reviewed ${counts.todo}`],
            ["pass", `Passed ${counts.pass}`],
            ["fail", `Failed ${counts.fail}`],
            ["star", `Starred ${counts.star}`],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button key={key} type="button" className={filter === key ? "is-on" : ""} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>
      <label className="admin-review-find">
        <span>Find by code</span>
        <input
          value={codeQuery}
          onChange={(e) => setCodeQuery(e.target.value)}
          placeholder="e.g. A1B2C3D4"
          aria-label="Find a photo by its takedown code"
        />
      </label>
      <p className="admin-photos-muted admin-review-tip">Tip: click a photo to see it large. Then P = pass, F = fail, S = star, arrows to move.</p>

      <ul className="admin-review-grid">
        {shown.map((p, i) => {
          const m = p.marks[reviewer];
          return (
            <li key={p.id} className={`admin-review-tile${m ? ` is-${m}` : ""}`}>
              <button type="button" className="admin-review-open" onClick={() => setOpen(i)} aria-label={`Open ${p.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" />
              </button>
              {p.stars[reviewer] ? <span className="admin-review-star" aria-label="Starred">★</span> : null}
              <span className="admin-review-code">{p.code}</span>
              <div className="admin-review-actions">
                <button type="button" className={m === "pass" ? "is-on" : ""} onClick={() => mark(p, "pass")}>
                  ✓ Pass
                </button>
                <button type="button" className={m === "fail" ? "is-on" : ""} onClick={() => mark(p, "fail")} aria-label="Fail">
                  ✕
                </button>
                <button type="button" className={p.stars[reviewer] ? "is-on" : ""} onClick={() => toggleStar(p)} aria-label="Star">
                  ★
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 ? <p className="admin-photos-muted">No photos here.</p> : null}

      <div className="admin-review-footer">
        <div className="admin-review-progress">
          <span>
            {photos.length - counts.todo} of {photos.length} reviewed{mineDone ? " · done" : ""}
          </span>
        </div>
        {night.published ? (
          <span className="admin-review-live-actions">
            <span className="admin-review-live">{night.hidden ? "Unpublished" : "Live"}. Changes show on the site right away.</span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                nightAction(
                  { action: "reopen" },
                  "Reopen review? The night comes off the site until the review is marked done again. Passes, fails and stars are kept.",
                  () => router.refresh(),
                )
              }
            >
              Reopen review
            </button>
          </span>
        ) : mineDone ? (
          <button type="button" onClick={() => setDone(false)} disabled={busy}>
            Reopen review
          </button>
        ) : (
          <button type="button" onClick={() => setDone(true)} disabled={busy || counts.todo > 0}>
            Mark review done
          </button>
        )}
        <p>
          {error ||
            (night.published
              ? "New photos added to this night stay hidden until they're passed. Failing a photo takes it down."
              : "Review every photo, then mark the review done and the night goes live with the photos you passed. You share this review, so either of you can do it, or split it.")}
        </p>
      </div>

      {swiping ? (
        <SwipeReview
          photos={photos}
          reviewer={reviewer}
          save={save}
          mineDone={mineDone}
          busy={busy}
          onDone={() => void setDone(true)}
          onClose={() => setSwiping(false)}
        />
      ) : null}

      {current ? (
        <div className="photo-viewer admin-review-viewer" role="dialog" aria-modal="true" aria-label={current.name}>
          <div className="photo-viewer-bar">
            <span>
              {open! + 1} / {shown.length} · {current.name} · code {current.code}
            </span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="photo-viewer-stage">
            <button type="button" className="photo-viewer-nav" disabled={open === 0} onClick={() => setOpen(open! - 1)} aria-label="Previous">
              ←
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.view} alt="" />
            <button type="button" className="photo-viewer-nav" disabled={open === shown.length - 1} onClick={() => setOpen(open! + 1)} aria-label="Next">
              →
            </button>
          </div>
          <div className="photo-viewer-actions admin-review-viewer-actions">
            <button type="button" className={current.marks[reviewer] === "pass" ? "is-on" : ""} onClick={() => mark(current, "pass")}>
              ✓ Pass (P)
            </button>
            <button type="button" className={current.marks[reviewer] === "fail" ? "is-on" : ""} onClick={() => mark(current, "fail")}>
              ✕ Fail (F)
            </button>
            <button type="button" className={current.stars[reviewer] ? "is-on" : ""} onClick={() => toggleStar(current)}>
              ★ Star (S)
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
