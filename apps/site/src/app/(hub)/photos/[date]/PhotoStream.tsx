"use client";

import { useEffect, useRef, useState } from "react";
import type { LivePhoto } from "@/lib/photoStore";

type Props = { title: string; when: string; by: string | null; date: string; photos: LivePhoto[] };

export default function PhotoStream({ title, when, by, date, photos }: Props) {
  const [view, setView] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (view === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setView(null);
      if (e.key === "ArrowRight") setView((v) => (v === null ? v : Math.min(photos.length - 1, v + 1)));
      if (e.key === "ArrowLeft") setView((v) => (v === null ? v : Math.max(0, v - 1)));
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [view, photos.length]);

  const current = view === null ? null : photos[view];

  return (
    <section className="photo-stream" aria-labelledby="photo-stream-title">
      <a className="photo-stream-back" href="/visit">
        <span aria-hidden="true">←</span> All nights
      </a>
      <header className="photo-stream-header">
        <p className="photo-stream-kicker">Market Nights</p>
        <h1 id="photo-stream-title">{title}</h1>
        <p className="photo-stream-meta">
          {when} · {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        <p className="photo-stream-credit">
          Free to download.{by ? <> Photos by <strong>{by}</strong>.</> : null} Tag <strong>@fwpublicmarket</strong> when you post.
        </p>
        <p className="photo-stream-takedown">
          See yourself and want a photo down? <a href={`/dm?night=${date}`}>Message us on Instagram</a>.
        </p>
      </header>

      <ul className="photo-stream-grid">
        {photos.map((p, i) => (
          <li key={p.id} style={{ aspectRatio: `${p.width} / ${p.height}` }}>
            <button type="button" onClick={() => setView(i)} aria-label={`Open photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={p.caption ?? ""} loading="lazy" />
            </button>
            {p.caption ? <span className="photo-stream-caption">{p.caption}</span> : null}
          </li>
        ))}
      </ul>

      {current ? (
        <div
          className="photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${view! + 1} of ${photos.length}`}
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX;
            touchX.current = null;
            if (start === null || end === undefined || Math.abs(end - start) < 50) return;
            setView((v) => (v === null ? v : end < start ? Math.min(photos.length - 1, v + 1) : Math.max(0, v - 1)));
          }}
        >
          <div className="photo-viewer-bar">
            <span>
              {view! + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => setView(null)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="photo-viewer-stage">
            <button type="button" className="photo-viewer-nav" disabled={view === 0} onClick={() => setView(view! - 1)} aria-label="Previous">
              ←
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={current.id} src={current.view} alt="" />
            <button
              type="button"
              className="photo-viewer-nav"
              disabled={view === photos.length - 1}
              onClick={() => setView(view! + 1)}
              aria-label="Next"
            >
              →
            </button>
          </div>
          {current.caption ? <p className="photo-viewer-caption">{current.caption}</p> : null}
          <div className="photo-viewer-actions">
            <a href={current.full} download={`public-market-${date}-${view! + 1}.jpg`}>
              Download photo
            </a>
            <span>Full size</span>
            <span className="photo-viewer-code">Photo {current.code}</span>
            <a className="photo-viewer-takedown" href={`/dm?night=${date}&photo=${current.code}`}>
              Ask us to take this down
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
