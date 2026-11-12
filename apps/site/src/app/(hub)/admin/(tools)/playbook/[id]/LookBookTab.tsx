"use client";

import { useRef, useState } from "react";
import type { Play } from "@/lib/playbookShared";
import { uploadPlayPhoto } from "../playbookClient";
import { InlineArea, InlineInput } from "./Inline";
import type { PlayApi } from "./usePlay";

export default function LookBookTab({ play, p, storageReady }: { play: Play; p: PlayApi; storageReady: boolean }) {
  const thisYear = Number(play.targetDate.slice(0, 4));
  const years = [...new Set([thisYear, ...play.photos.map((ph) => ph.year)])].sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]);
  const [area, setArea] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = play.photos.filter((ph) => ph.year === year);
  const areas = [...new Set(play.photos.map((ph) => ph.area).filter(Boolean))];

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of [...files]) {
      const key = await p.run(() => uploadPlayPhoto(play.id, file));
      if (key) await p.add("photos", { key, area, caption, year, sort: play.photos.length });
    }
    setUploading(false);
    setCaption("");
  };

  return (
    <div className="pb-look">
      <p className="admin-mailing-list-note">
        How we want every area to look, so anyone new can set it up the same way. Take a photo from your phone once it&apos;s
        right and say what matters. Past years stay here for reference.
      </p>
      <div className="pb-years">
        {years.map((y) => (
          <button key={y} type="button" className={y === year ? "is-active" : undefined} onClick={() => setYear(y)}>
            {y}
            {play.photos.some((ph) => ph.year === y) ? ` · ${play.photos.filter((ph) => ph.year === y).length}` : ""}
          </button>
        ))}
      </div>

      {storageReady ? (
        <div className="pb-look-form">
          <input value={area} onChange={(e) => setArea(e.target.value)} list="pb-areas" placeholder="Area, e.g. Front window · the tree" />
          <datalist id="pb-areas">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="How it should be, e.g. gold only, lights wrapped vertically" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : `📷 Add ${year} photo`}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </div>
      ) : (
        <p className="admin-photos-warning">Photo storage isn&apos;t connected, so photos can&apos;t be added.</p>
      )}

      {shown.length ? (
        <ul>
          {shown.map((ph) => (
            <li key={ph.id}>
              <button type="button" className="pb-look-img" onClick={() => setViewing(ph.view)} aria-label="See it bigger">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.thumb} alt={ph.area} loading="lazy" />
              </button>
              <InlineInput className="pb-look-area" value={ph.area} placeholder="Area" aria-label="Area" onSave={(v) => p.update("photos", ph.id, { area: v })} />
              <InlineArea value={ph.caption} rows={3} placeholder="How it should look" aria-label="How it should look" onSave={(v) => p.update("photos", ph.id, { caption: v })} />
              <button type="button" className="is-quiet" onClick={() => window.confirm("Remove this photo?") && p.remove("photos", ph.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-pe-empty">No {year} photos yet.</p>
      )}

      {viewing ? (
        <div className="contest-viewer" role="dialog" aria-modal="true" onClick={() => setViewing(null)}>
          <button type="button" className="contest-viewer-close" aria-label="Close">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="" />
        </div>
      ) : null}
    </div>
  );
}
