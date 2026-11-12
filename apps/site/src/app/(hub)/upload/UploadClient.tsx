"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContributorNight } from "@/lib/photoStore";
import { makeCopies, postJson, putFile } from "@/lib/photoClient";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

export type NightOption = { date: string; title: string; label: string };

type Status = "waiting" | "processing" | "uploading" | "done" | "failed";
type Item = { key: string; file: File; status: Status; progress: number; error?: string; preview?: string };

const PARALLEL = 3;
const RETRIES = 2;

const fmtDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export default function UploadClient({ options, nights, storageReady }: { options: NightOption[]; nights: ContributorNight[]; storageReady: boolean }) {
  const router = useRouter();
  const [choice, setChoice] = useState(options[0]?.date ?? "other");
  const [otherDate, setOtherDate] = useState("");
  const [title, setTitle] = useState(options[0]?.title ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);

  const date = choice === "other" ? otherDate : choice;

  const pickNight = (value: string) => {
    setChoice(value);
    const option = options.find((o) => o.date === value);
    if (option) setTitle(option.title);
    else if (value === "other") setTitle("");
  };

  const addFiles = (list: FileList | null) => {
    if (!list || running) return;
    const accepted = [...list].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    const skipped = list.length - accepted.length;
    setMessage(skipped ? `${skipped} file${skipped === 1 ? "" : "s"} skipped (JPEG, PNG or WebP only).` : "");
    setItems((current) => [
      ...current.filter((i) => i.status !== "done"),
      ...accepted
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((file) => ({ key: `${file.name}-${file.size}-${file.lastModified}`, file, status: "waiting" as Status, progress: 0 })),
    ]);
  };

  const update = (key: string, patch: Partial<Item>) =>
    setItems((current) => current.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const start = async () => {
    if (!date || !title.trim()) {
      setMessage("Pick the night and give it a name first.");
      return;
    }
    const queue = items.filter((i) => i.status === "waiting" || i.status === "failed");
    if (queue.length === 0) return;
    setRunning(true);
    setMessage("");
    startedAt.current = Date.now();

    let nightId: string;
    try {
      const { night } = await postJson<{ night: { id: string } }>("/upload/api/nights", { date, title: title.trim() });
      nightId = night.id;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't start the upload.");
      setRunning(false);
      return;
    }

    const uploadOne = async (item: Item) => {
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          update(item.key, { status: "processing", progress: 0, error: undefined });
          const copies = await makeCopies(item.file);
          update(item.key, { status: "uploading", preview: URL.createObjectURL(copies.blobs.thumb) });
          const { id, uploads, downloadName } = await postJson<{ id: string; uploads: Record<"full" | "view" | "thumb", string>; downloadName: string }>(
            "/upload/api/photos",
            { nightId, name: item.file.name, width: copies.width, height: copies.height },
          );
          const total = copies.blobs.full.size + copies.blobs.view.size + copies.blobs.thumb.size;
          const sent = { full: 0, view: 0, thumb: 0 };
          const report = () => update(item.key, { progress: Math.round(((sent.full + sent.view + sent.thumb) / total) * 100) });
          const cache = "public, max-age=31536000, immutable";
          await Promise.all([
            putFile(uploads.full, copies.blobs.full, { "Content-Type": "image/jpeg", "Cache-Control": cache, "Content-Disposition": `attachment; filename="${downloadName}"` }, (n) => { sent.full = n; report(); }),
            putFile(uploads.view, copies.blobs.view, { "Content-Type": "image/jpeg", "Cache-Control": cache }, (n) => { sent.view = n; report(); }),
            putFile(uploads.thumb, copies.blobs.thumb, { "Content-Type": "image/jpeg", "Cache-Control": cache }, (n) => { sent.thumb = n; report(); }),
          ]);
          await postJson(`/upload/api/photos/${id}/complete`, {});
          update(item.key, { status: "done", progress: 100 });
          return;
        } catch (error) {
          if (attempt === RETRIES) {
            update(item.key, { status: "failed", error: error instanceof Error ? error.message : "Upload failed" });
          }
        }
      }
    };

    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
        while (next < queue.length) await uploadOne(queue[next++]);
      }),
    );
    setRunning(false);
    router.refresh();
  };

  const counts = useMemo(() => {
    const c = { done: 0, failed: 0, active: 0, waiting: 0 };
    for (const i of items) {
      if (i.status === "done") c.done++;
      else if (i.status === "failed") c.failed++;
      else if (i.status === "waiting") c.waiting++;
      else c.active++;
    }
    return c;
  }, [items]);

  const total = items.length;
  const eta = (() => {
    if (!running || counts.done < 2) return "";
    const perPhoto = (Date.now() - startedAt.current) / counts.done;
    const left = Math.ceil((perPhoto * (total - counts.done - counts.failed)) / 60000);
    return left <= 1 ? "About a minute left" : `About ${left} minutes left`;
  })();
  const visible = [
    ...items.filter((i) => i.status === "failed"),
    ...items.filter((i) => i.status === "processing" || i.status === "uploading"),
    ...items.filter((i) => i.status === "waiting").slice(0, 3),
    ...items.filter((i) => i.status === "done").slice(-3),
  ];

  if (!storageReady) {
    return (
      <section className="upload-card">
        <h1>Upload a night</h1>
        <p className="upload-note">Uploads aren&apos;t switched on yet. Check back soon.</p>
      </section>
    );
  }

  return (
    <>
      <section className="upload-card" aria-labelledby="upload-title">
        <h1 id="upload-title">Upload a night</h1>

        <label className="upload-field">
          <span>1. Which night?</span>
          <select value={choice} onChange={(e) => pickNight(e.target.value)} disabled={running}>
            {options.map((o) => (
              <option key={o.date} value={o.date}>
                {fmtDate(o.date)} · {o.label}
              </option>
            ))}
            <option value="other">Not on the calendar, enter a date</option>
          </select>
        </label>
        {choice === "other" ? (
          <label className="upload-field">
            <span>Date</span>
            <VenueDateTimeField mode="date" tone="light" ariaLabel="Date" value={otherDate} onChange={setOtherDate} allowClear={false} disabled={running} />
          </label>
        ) : null}
        <label className="upload-field">
          <span>Name of the night</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CASIO McCOMBS" maxLength={80} disabled={running} />
        </label>

        <div className="upload-field">
          <span>2. Add the photos</span>
          <button
            type="button"
            className={`upload-drop${dragging ? " is-dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            disabled={running}
          >
            <strong>Drop your exported photos here</strong>
            <span>
              or <u>choose files</u>
            </span>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <p className="upload-note">
            Before anything uploads, your browser resizes each photo and removes location data. Your originals never
            leave your computer.
          </p>
        </div>

        {total > 0 ? (
          <div className="upload-progress" aria-label="Upload progress">
            <div className="upload-progress-head">
              <strong>
                {running
                  ? `Uploading ${counts.done + counts.active} of ${total}`
                  : counts.done === total
                    ? `All ${total} uploaded. They're with the Public Market for review.`
                    : `${total} photo${total === 1 ? "" : "s"} ready${counts.done ? ` · ${counts.done} uploaded` : ""}`}
              </strong>
              <span>{eta}</span>
            </div>
            <div className="upload-bar">
              <span style={{ width: `${total ? Math.round((counts.done / total) * 100) : 0}%` }} />
            </div>
            <ul>
              {visible.map((i) => (
                <li key={i.key} className={i.status === "failed" ? "is-failed" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.preview ? <img src={i.preview} alt="" /> : <span className="upload-thumb-empty" />}
                  <span>{i.file.name}</span>
                  <span className="upload-bar upload-bar--small">
                    <span style={{ width: `${i.progress}%` }} />
                  </span>
                  <em>
                    {i.status === "done" ? "Done" : i.status === "failed" ? "Failed" : i.status === "processing" ? "Preparing" : i.status === "uploading" ? `${i.progress}%` : "Waiting"}
                  </em>
                </li>
              ))}
            </ul>
            {counts.failed ? <p className="upload-error">{counts.failed} didn&apos;t upload. Press Upload again to retry them.</p> : null}
            {!running && counts.done < total ? (
              <button type="button" className="upload-start" onClick={start}>
                Upload {total - counts.done} photo{total - counts.done === 1 ? "" : "s"}
              </button>
            ) : null}
            {running ? <p className="upload-note">Keep this tab open until it finishes.</p> : null}
          </div>
        ) : null}
        {message ? <p className="upload-error">{message}</p> : null}
      </section>

      <section className="upload-card" aria-labelledby="upload-history-title">
        <h2 id="upload-history-title">Your uploads</h2>
        {nights.length === 0 ? (
          <p className="upload-note">Nothing yet.</p>
        ) : (
          <ul className="upload-history">
            {nights.map((n) => (
              <li key={n.date}>
                <span>
                  {fmtDate(n.date)} · {n.title}
                </span>
                <span>{n.photos} photos</span>
                <em className={n.live ? "is-live" : undefined}>{n.live ? `Live · ${n.shown} shown` : "In review"}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
