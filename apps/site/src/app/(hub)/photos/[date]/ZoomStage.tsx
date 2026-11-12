"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";

// The photo viewer's middle area on phones: pinch to zoom, drag to look
// around a zoomed photo, double-tap to zoom in or out. A sideways swipe
// moves to the next or previous photo only when the photo isn't zoomed
// and only one finger was used, so zooming never skips a photo.

type Zoom = { s: number; x: number; y: number };
type Pt = { x: number; y: number };

const MAX = 4;
const DOUBLE_TAP = 2.5;
const NONE: Zoom = { s: 1, x: 0, y: 0 };

type Gesture =
  | { kind: "none" }
  | { kind: "swipe"; start: Pt; at: number }
  | { kind: "pan"; start: Pt; from: Zoom }
  | { kind: "pinch"; dist: number; mid: Pt; from: Zoom };

type Props = {
  photoKey: string;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  className?: string;
};

const pt = (t: { clientX: number; clientY: number }): Pt => ({ x: t.clientX, y: t.clientY });

export default function ZoomStage({ photoKey, onPrev, onNext, children, className }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom>(NONE);
  const zoomRef = useRef<Zoom>(NONE);
  const gesture = useRef<Gesture>({ kind: "none" });
  const lastTap = useRef<{ at: number; p: Pt } | null>(null);

  const apply = (z: Zoom) => {
    const next = clamp(z);
    zoomRef.current = next;
    setZoom(next);
  };

  // A new photo always opens unzoomed.
  useEffect(() => {
    zoomRef.current = NONE;
    setZoom(NONE);
    gesture.current = { kind: "none" };
  }, [photoKey]);

  // Safari's own pinch gesture would zoom the whole page; keep it on the photo.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", stop, { passive: false });
    el.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      el.removeEventListener("gesturestart", stop);
      el.removeEventListener("gesturechange", stop);
    };
  }, []);

  // Keep a zoomed photo from sliding off screen.
  function clamp(z: Zoom): Zoom {
    const s = Math.min(MAX, Math.max(1, z.s));
    const img = stage.current?.querySelector("img");
    if (s <= 1.01 || !img) return NONE;
    const maxX = ((s - 1) * img.offsetWidth) / 2;
    const maxY = ((s - 1) * img.offsetHeight) / 2;
    return { s, x: Math.min(maxX, Math.max(-maxX, z.x)), y: Math.min(maxY, Math.max(-maxY, z.y)) };
  }

  // The photo's centre on screen when it isn't moved (zooming keeps the centre).
  function centre(): Pt {
    const img = stage.current?.querySelector("img");
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    return { x: r.left + r.width / 2 - zoomRef.current.x, y: r.top + r.height / 2 - zoomRef.current.y };
  }

  // Zoom by a factor around a point on screen, keeping that point still.
  function zoomAround(from: Zoom, startMid: Pt, mid: Pt, s: number): Zoom {
    const c = centre();
    const qx = (startMid.x - c.x - from.x) / from.s;
    const qy = (startMid.y - c.y - from.y) / from.s;
    return { s, x: mid.x - c.x - s * qx, y: mid.y - c.y - s * qy };
  }

  const onTouchStart = (e: TouchEvent) => {
    if ((e.target as Element).closest("button, a")) return;
    const z = zoomRef.current;
    if (e.touches.length >= 2) {
      const a = pt(e.touches[0]);
      const b = pt(e.touches[1]);
      gesture.current = {
        kind: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        from: z,
      };
      lastTap.current = null;
      return;
    }
    const p = pt(e.touches[0]);
    gesture.current = z.s > 1 ? { kind: "pan", start: p, from: z } : { kind: "swipe", start: p, at: Date.now() };
  };

  const onTouchMove = (e: TouchEvent) => {
    const g = gesture.current;
    if (g.kind === "pinch" && e.touches.length >= 2) {
      const a = pt(e.touches[0]);
      const b = pt(e.touches[1]);
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(MAX, Math.max(1, g.from.s * (dist / g.dist)));
      apply(zoomAround(g.from, g.mid, mid, s));
    } else if (g.kind === "pan" && e.touches.length === 1) {
      const p = pt(e.touches[0]);
      apply({ s: g.from.s, x: g.from.x + p.x - g.start.x, y: g.from.y + p.y - g.start.y });
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    const g = gesture.current;
    if (g.kind === "pinch") {
      // One finger lifted: carry on as a drag if zoomed, never as a swipe.
      gesture.current =
        e.touches.length === 1 && zoomRef.current.s > 1
          ? { kind: "pan", start: pt(e.touches[0]), from: zoomRef.current }
          : { kind: "none" };
      return;
    }
    if (e.touches.length > 0) return;
    gesture.current = { kind: "none" };
    const end = e.changedTouches[0] ? pt(e.changedTouches[0]) : null;
    if (!end) return;
    if (g.kind === "pan") {
      if (Math.hypot(end.x - g.start.x, end.y - g.start.y) < 10) tap(end);
      return;
    }
    if (g.kind !== "swipe") return;
    const dx = end.x - g.start.x;
    const dy = end.y - g.start.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      tap(end);
      return;
    }
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onNext();
      else onPrev();
    }
  };

  // Two quick taps zoom in on that spot, or back out if already zoomed.
  function tap(p: Pt) {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && now - prev.at < 320 && Math.hypot(p.x - prev.p.x, p.y - prev.p.y) < 40) {
      lastTap.current = null;
      const z = zoomRef.current;
      apply(z.s > 1 ? NONE : zoomAround(NONE, p, centreToward(p), DOUBLE_TAP));
      return;
    }
    lastTap.current = { at: now, p };
  }

  // Zooming from a double-tap brings the tapped spot toward the middle.
  function centreToward(p: Pt): Pt {
    const c = centre();
    return { x: c.x + (p.x - c.x) * 0.5, y: c.y + (p.y - c.y) * 0.5 };
  }

  return (
    <div
      ref={stage}
      className={className}
      data-zoomed={zoom.s > 1 ? "" : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        gesture.current = { kind: "none" };
      }}
      style={{ ["--zoom-transform" as string]: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` }}
    >
      {children}
    </div>
  );
}
