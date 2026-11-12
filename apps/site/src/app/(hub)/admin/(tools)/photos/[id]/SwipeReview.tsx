"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mark, Reviewer } from "@/lib/photoShared";
import type { ReviewPhoto } from "@/lib/photoStore";

type Props = {
  photos: ReviewPhoto[];
  reviewer: Reviewer;
  save: (photo: ReviewPhoto, change: { mark?: Mark | null; star?: boolean }) => Promise<void>;
  mineDone: boolean;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
};

type Swipe = "pass" | "fail" | "highlight";
const THRESHOLD = 90;
const DOUBLE_TAP_MS = 300;
const TIP_KEY = "pm-swipe-tip-seen";

// One photo at a time, like Tinder: swipe right for yes (pass), left for
// no (fail), double-tap to highlight (star + yes, then the next photo).
// Only photos not reviewed yet are dealt.
export default function SwipeReview({ photos, reviewer, save, mineDone, busy, onDone, onClose }: Props) {
  const queue = useMemo(() => photos.filter((p) => !p.marks[reviewer]), [photos, reviewer]);
  const reviewed = photos.length - queue.length;
  const card = queue[0] ?? null;
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState<Swipe | null>(null);
  // What each decision did, so Undo can reverse it exactly.
  const [history, setHistory] = useState<{ id: string; addedStar: boolean }[]>([]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState<{ id: number; on: boolean } | null>(null);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(TIP_KEY)) setTip(true);
    } catch {}
  }, []);

  const hideTip = useCallback(() => {
    setTip(false);
    try {
      window.localStorage.setItem(TIP_KEY, "1");
    } catch {}
  }, []);

  // Warm the next couple of photos so the stack feels instant.
  useEffect(() => {
    for (const p of queue.slice(1, 3)) {
      const img = new Image();
      img.src = p.view;
    }
  }, [queue]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const commit = useCallback(
    (swipe: Swipe) => {
      if (!card || leaving) return;
      if (tip) hideTip();
      const target = card;
      const highlight = swipe === "highlight";
      // A highlight shows its star first, then the card flies up.
      if (highlight) setBurst({ id: Date.now(), on: true });
      setLeaving(swipe);
      window.setTimeout(
        () => {
          const addedStar = highlight && !target.stars[reviewer];
          setHistory((h) => [...h, { id: target.id, addedStar }]);
          void save(target, { mark: swipe === "fail" ? "fail" : "pass" });
          if (addedStar) void save(target, { star: true });
          setLeaving(null);
          setDrag({ x: 0, y: 0, active: false });
        },
        highlight ? 520 : 180,
      );
    },
    [card, leaving, save, tip, hideTip, reviewer],
  );

  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(null), 650);
    return () => window.clearTimeout(timer);
  }, [burst]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    const photo = last ? photos.find((p) => p.id === last.id) : null;
    if (!last || !photo) return;
    setHistory((h) => h.slice(0, -1));
    void save(photo, { mark: null });
    if (last.addedStar) void save(photo, { star: false });
  }, [history, photos, save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") commit("pass");
      else if (e.key === "ArrowLeft") commit("fail");
      else if (e.key.toLowerCase() === "s" || e.key === "ArrowUp") commit("highlight");
      else if (e.key.toLowerCase() === "z") undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo, onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (leaving) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    const moved = Math.hypot(drag.x, drag.y);
    if (drag.x > THRESHOLD) commit("pass");
    else if (drag.x < -THRESHOLD) commit("fail");
    else {
      setDrag({ x: 0, y: 0, active: false });
      // A tap, not a drag: two in quick succession highlight the photo.
      if (moved < 10) {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0;
          commit("highlight");
        } else lastTap.current = now;
      }
    }
  };

  const transform = leaving
    ? leaving === "pass"
      ? "translate(130vw, 0) rotate(24deg)"
      : leaving === "fail"
        ? "translate(-130vw, 0) rotate(-24deg)"
        : "translate(0, -130vh)"
    : `translate(${drag.x}px, ${Math.max(-40, Math.min(drag.y, 40))}px) rotate(${drag.x / 18}deg)`;
  // Highlights pause on the star before flying off.
  const cardTransition = leaving === "highlight" ? "transform 280ms ease-in 240ms" : undefined;
  const hint = leaving ?? (drag.x > 30 ? "pass" : drag.x < -30 ? "fail" : null);
  const hintStrength = leaving ? 1 : Math.min(1, Math.abs(drag.x) / THRESHOLD);

  return (
    <div className="swipe-review" role="dialog" aria-modal="true" aria-label="Review photos">
      <header className="swipe-review-bar">
        <button type="button" onClick={onClose} aria-label="Back to the grid">
          ← Grid
        </button>
        <span>
          {reviewed} / {photos.length} reviewed
        </span>
        <button type="button" onClick={undo} disabled={history.length === 0} aria-label="Undo last">
          ↶ Undo
        </button>
      </header>
      <div className="swipe-review-progress" aria-hidden="true">
        <span style={{ width: `${photos.length ? (reviewed / photos.length) * 100 : 0}%` }} />
      </div>

      {card ? (
        <>
          <div className="swipe-review-stage">
            {queue[1] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="swipe-review-next" src={queue[1].view} alt="" />
            ) : null}
            <div
              key={card.id}
              className={`swipe-review-card${drag.active ? " is-dragging" : ""}`}
              style={{ transform, transition: cardTransition }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.view} alt="" draggable={false} />
              {hint ? (
                <span className={`swipe-review-stamp is-${hint}`} style={{ opacity: hintStrength }}>
                  {hint === "pass" ? "Yes" : hint === "fail" ? "No" : "★ Yes"}
                </span>
              ) : null}
              <span className="swipe-review-code">{card.code}</span>
              {card.stars[reviewer] ? <span className="swipe-review-starred">★ Highlight</span> : null}
              {burst ? (
                <span key={burst.id} className={`swipe-review-burst${burst.on ? "" : " is-off"}`} aria-hidden="true">
                  ★
                </span>
              ) : null}
            </div>
            {tip ? (
              <div className="swipe-review-tip" role="note">
                <span>
                  <b>←</b> No
                </span>
                <span>
                  Yes <b>→</b>
                </span>
                <span>Double-tap to highlight (counts as yes)</span>
                <button type="button" onClick={hideTip}>
                  Got it
                </button>
              </div>
            ) : null}
          </div>
          <div className="swipe-review-actions">
            <button type="button" className="is-fail" onClick={() => commit("fail")} aria-label="No">
              ✕
            </button>
            <button
              type="button"
              className={`is-star${card.stars[reviewer] ? " is-on" : ""}`}
              onClick={() => commit("highlight")}
              aria-label="Highlight"
            >
              ★
            </button>
            <button type="button" className="is-pass" onClick={() => commit("pass")} aria-label="Yes">
              ✓
            </button>
          </div>
          <p className="swipe-review-help">← No · Yes → · Double-tap to highlight + yes</p>
        </>
      ) : (
        <div className="swipe-review-empty">
          <strong>All {photos.length} reviewed</strong>
          <p>{mineDone ? "The review is marked done." : "Mark the review done and the night goes live."}</p>
          {!mineDone ? (
            <button type="button" className="swipe-review-done" onClick={onDone} disabled={busy}>
              Mark review done
            </button>
          ) : null}
          <button type="button" className="swipe-review-back" onClick={onClose}>
            Back to the grid
          </button>
        </div>
      )}
    </div>
  );
}
