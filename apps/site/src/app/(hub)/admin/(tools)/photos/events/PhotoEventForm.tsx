"use client";

import { useState } from "react";
import { CATEGORY_SUGGESTIONS, MAX_CATEGORIES, type ContestForm } from "@/lib/contestShared";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

type Props = {
  initial: ContestForm;
  submitLabel: string;
  dateLocked?: boolean;
  onSubmit: (form: ContestForm) => Promise<string | null>;
};

export default function PhotoEventForm({ initial, submitLabel, dateLocked, onSubmit }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof ContestForm>(key: K, value: ContestForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const nextDay = (open: string, close: string) => close <= open;
  const setCount = (count: number) =>
    setForm((f) => {
      const categories = f.categories.slice(0, count);
      for (let i = categories.length; i < count; i++) {
        const used = new Set(categories.map((c) => c.name));
        categories.push({ id: "", name: CATEGORY_SUGGESTIONS.find((n) => !used.has(n)) ?? `Prize ${i + 1}` });
      }
      return { ...f, categories };
    });
  const rename = (index: number, name: string) =>
    setForm((f) => ({ ...f, categories: f.categories.map((c, i) => (i === index ? { ...c, name } : c)) }));

  return (
    <form
      className="admin-pe-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError((await onSubmit(form)) ?? "");
        setBusy(false);
      }}
    >
      <label className="admin-pe-wide">
        <span>Name</span>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={80} required />
      </label>
      <label>
        <span>Date (the night it happens)</span>
        <VenueDateTimeField mode="date" tone="light" ariaLabel="Date" value={form.date} onChange={(v) => set("date", v)} allowClear={false} disabled={dateLocked} required />
      </label>
      <p className="admin-pe-hint">Guests use fwpublicmarket.com/contest, and the calendar day links to it.</p>
      <label>
        <span>Entries open</span>
        <VenueDateTimeField mode="time" tone="light" ariaLabel="Entries open" value={form.uploadOpen} onChange={(v) => set("uploadOpen", v)} allowClear={false} dayStart={720} required />
      </label>
      <label>
        <span>Entries close{nextDay(form.uploadOpen, form.uploadClose) ? " (next morning)" : ""}</span>
        <VenueDateTimeField mode="time" tone="light" ariaLabel="Entries close" value={form.uploadClose} onChange={(v) => set("uploadClose", v)} allowClear={false} dayStart={720} required />
      </label>
      <label>
        <span>Voting opens</span>
        <VenueDateTimeField mode="time" tone="light" ariaLabel="Voting opens" value={form.voteOpen} onChange={(v) => set("voteOpen", v)} allowClear={false} dayStart={720} required />
      </label>
      <label>
        <span>Voting closes{nextDay(form.voteOpen, form.voteClose) ? " (next morning)" : ""}</span>
        <VenueDateTimeField mode="time" tone="light" ariaLabel="Voting closes" value={form.voteClose} onChange={(v) => set("voteClose", v)} allowClear={false} dayStart={720} required />
      </label>
      <p className="admin-pe-hint admin-pe-wide">
        Kansas City time. A closing time earlier than its opening time means after midnight, so 9:00 PM to 1:00 AM
        closes at 1 AM the next morning. One vote per phone, votes are final, and counts stay hidden from guests until
        voting closes.
      </p>
      <fieldset className="admin-pe-wide">
        <legend>Winners</legend>
        <label className="admin-pe-count">
          <span>Number of winners</span>
          <select value={form.categories.length} onChange={(e) => setCount(Number(e.target.value))}>
            {Array.from({ length: MAX_CATEGORIES }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <ol className="admin-pe-prizes">
          {form.categories.map((category, i) => (
            <li key={i}>
              <input
                value={category.name}
                onChange={(e) => rename(i, e.target.value)}
                maxLength={40}
                placeholder="e.g. Scariest"
                aria-label={`Winner ${i + 1}`}
                required
              />
            </li>
          ))}
        </ol>
        <p className="admin-pe-hint">
          Guests get one vote in each category, and every vote is final. Changing a name later keeps its votes;
          removing a category drops its votes.
        </p>
        <label className="admin-pe-radio">
          <input type="checkbox" checked={form.onePrizeEach} onChange={(e) => set("onePrizeEach", e.target.checked)} />
          <span>
            <strong>One prize per costume.</strong> If a costume tops more than one category, it keeps the first (in
            this order) and the next most-voted costume gets the other.
          </span>
        </label>
      </fieldset>
      <fieldset className="admin-pe-wide">
        <legend>Photo safety</legend>
        <label className="admin-pe-radio">
          <input type="radio" name="moderation" checked={form.moderation === "auto"} onChange={() => set("moderation", "auto")} />
          <span>
            <strong>Auto-check, hold anything flagged</strong> (recommended). Clean photos go up right away; possible
            nudity or explicit content waits for staff.
          </span>
        </label>
        <label className="admin-pe-radio">
          <input type="radio" name="moderation" checked={form.moderation === "manual"} onChange={() => set("moderation", "manual")} />
          <span>
            <strong>Staff approve every photo first.</strong> Nothing shows until someone taps Approve.
          </span>
        </label>
        <label className="admin-pe-radio">
          <input type="checkbox" checked={form.hideAfterReports} onChange={(e) => set("hideAfterReports", e.target.checked)} />
          <span>Hide a photo automatically after 3 guests report it</span>
        </label>
      </fieldset>
      {error ? (
        <p className="admin-pe-error admin-pe-wide" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-pe-actions admin-pe-wide">
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
