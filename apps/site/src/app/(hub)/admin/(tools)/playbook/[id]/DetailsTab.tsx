"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLAY_KINDS, addDays, daysBetween, shortDate, type KeyDate, type Person, type Play, type PlayKind } from "@/lib/playbookShared";
import { api } from "../playbookClient";
import { InlineArea, InlineInput } from "./Inline";
import type { PlayApi } from "./usePlay";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

const KINDS: { id: KeyDate["kind"]; label: string }[] = [
  { id: "hours", label: "Hours / closed" },
  { id: "party", label: "Party / event" },
  { id: "milestone", label: "Milestone" },
];

export default function DetailsTab({ play, people, p }: { play: Play; people: Person[]; p: PlayApi }) {
  const router = useRouter();
  const [d, setD] = useState({
    title: play.title,
    kind: play.kind,
    targetDate: play.targetDate,
    planStart: play.planStart ?? "",
    ownerId: play.ownerId ?? "",
    goal: play.goal,
  });
  const [date, setDate] = useState({ on: play.targetDate, kind: "hours" as KeyDate["kind"], label: "" });
  const [run, setRun] = useState({ on: play.targetDate, time: "", what: "" });
  const moved = d.targetDate !== play.targetDate;

  return (
    <div className="pb-details">
      <form
        className="admin-pe-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await p.patchPlay({ ...d, planStart: d.planStart || null, ownerId: d.ownerId || null });
        }}
      >
        <label className="admin-pe-wide">
          <span>Name</span>
          <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required />
        </label>
        <label>
          <span>The day it builds to</span>
          <VenueDateTimeField mode="date" tone="light" ariaLabel="The day it builds to" value={d.targetDate} onChange={(v) => setD({ ...d, targetDate: v })} allowClear={false} required />
        </label>
        <label>
          <span>Planning starts (kickoff email)</span>
          <VenueDateTimeField mode="date" tone="light" ariaLabel="Planning starts" value={d.planStart ?? ""} onChange={(v) => setD({ ...d, planStart: v })} marks={{ [d.targetDate]: "the day it builds to" }} />
        </label>
        <label>
          <span>Kind</span>
          <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as PlayKind })}>
            {PLAY_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Owner</span>
          <select value={d.ownerId} onChange={(e) => setD({ ...d, ownerId: e.target.value })}>
            <option value="">No owner</option>
            {people.filter((x) => x.active || x.id === play.ownerId).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-pe-wide">
          <span>Goal</span>
          <input value={d.goal} onChange={(e) => setD({ ...d, goal: e.target.value })} placeholder="What does a win look like?" />
        </label>
        {moved ? (
          <p className="admin-pe-hint admin-pe-wide">
            Moving the day moves every task with it ({daysBetween(play.targetDate, d.targetDate) > 0 ? "+" : ""}
            {daysBetween(play.targetDate, d.targetDate)} days).
          </p>
        ) : null}
        <div className="admin-pe-actions admin-pe-wide">
          <button type="submit" disabled={p.busy}>
            Save details
          </button>
        </div>
      </form>

      <div className="pb-two">
        <section>
          <h2 className="pb-section-h">Key dates</h2>
          <p className="admin-pe-hint">Close dates, special hours, parties and milestones. They show beside the countdown.</p>
          <ul className="pb-mini-list">
            {play.dates.map((k) => (
              <li key={k.id}>
                <VenueDateTimeField
                  mode="date"
                  tone="light"
                  ariaLabel={`${k.label} date`}
                  value={addDays(play.targetDate, k.offsetDays)}
                  allowClear={false}
                  marks={{ [play.targetDate]: "the day it builds to" }}
                  onChange={(v) => v && p.update("dates", k.id, { offsetDays: daysBetween(play.targetDate, v) })}
                />
                <select value={k.kind} aria-label="Kind" onChange={(e) => p.update("dates", k.id, { kind: e.target.value })}>
                  {KINDS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <InlineInput value={k.label} aria-label="What" onSave={(v) => p.update("dates", k.id, { label: v })} />
                <button type="button" className="is-quiet" aria-label="Remove" onClick={() => p.remove("dates", k.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="pb-inline-add"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!date.label.trim()) return;
              if (await p.add("dates", { offsetDays: daysBetween(play.targetDate, date.on), kind: date.kind, label: date.label, sort: play.dates.length })) setDate({ ...date, label: "" });
            }}
          >
            <VenueDateTimeField mode="date" tone="light" ariaLabel="New key date" value={date.on} allowClear={false} marks={{ [play.targetDate]: "the day it builds to" }} onChange={(v) => setDate({ ...date, on: v })} />
            <select value={date.kind} onChange={(e) => setDate({ ...date, kind: e.target.value as KeyDate["kind"] })}>
              {KINDS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <input value={date.label} onChange={(e) => setDate({ ...date, label: e.target.value })} placeholder="e.g. Closed all day" />
            <button type="submit">+ Add</button>
          </form>
        </section>

        <section>
          <h2 className="pb-section-h">Run of show</h2>
          <p className="admin-pe-hint">Hour-by-hour plan for the day (or any day around it).</p>
          <ul className="pb-mini-list">
            {play.run.map((r) => (
              <li key={r.id}>
                <span className="pb-mini-date">{shortDate(addDays(play.targetDate, r.offsetDays))}</span>
                <InlineInput value={r.timeLabel} placeholder="Time" aria-label="Time" onSave={(v) => p.update("run", r.id, { timeLabel: v })} />
                <InlineInput value={r.what} aria-label="What happens" onSave={(v) => p.update("run", r.id, { what: v })} />
                <button type="button" className="is-quiet" aria-label="Remove" onClick={() => p.remove("run", r.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="pb-inline-add"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!run.what.trim()) return;
              if (await p.add("run", { offsetDays: daysBetween(play.targetDate, run.on), timeLabel: run.time, what: run.what, sort: play.run.length })) setRun({ ...run, time: "", what: "" });
            }}
          >
            <VenueDateTimeField mode="date" tone="light" ariaLabel="Run of show date" value={run.on} allowClear={false} marks={{ [play.targetDate]: "the day it builds to" }} onChange={(v) => setRun({ ...run, on: v })} />
            <input value={run.time} onChange={(e) => setRun({ ...run, time: e.target.value })} placeholder="8:00 PM" />
            <input value={run.what} onChange={(e) => setRun({ ...run, what: e.target.value })} placeholder="What happens" />
            <button type="submit">+ Add</button>
          </form>
        </section>
      </div>

      <section className="pb-notes-grid">
        <label>
          <span>Notes</span>
          <InlineArea value={play.notes} rows={6} placeholder="Anything the team should know: contacts, vendors, codes, decisions…" onSave={(v) => p.patchPlay({ notes: v })} />
        </label>
        <label>
          <span>Notes for next time</span>
          <InlineArea value={play.nextTimeNotes} rows={6} placeholder="What to change next year. These carry into the copy." onSave={(v) => p.patchPlay({ nextTimeNotes: v })} />
        </label>
        <label>
          <span>Notes from last time</span>
          <InlineArea value={play.lastTimeNotes} rows={6} placeholder="Carried over from the play this was copied from." onSave={(v) => p.patchPlay({ lastTimeNotes: v })} />
        </label>
      </section>

      <div className="admin-pe-actions admin-pe-bar">
        <a className="pb-btn" href={`/admin/playbook/new?from=${play.id}`}>
          ⧉ Copy to next year
        </a>
        {!play.isTemplate ? (
          <button
            type="button"
            className="is-quiet"
            onClick={async () => {
              const r = await p.run(() => api<{ id: string }>("POST", "/admin/api/playbook/plays", { sourceId: play.id, title: `${play.title.replace(/\s*\d{4}$/, "")} (template)`, targetDate: play.targetDate, isTemplate: true }));
              if (r) router.push(`/admin/playbook/${r.id}`);
            }}
          >
            Save as template
          </button>
        ) : null}
        <a className="is-quiet pb-link-btn" href={`/admin/api/playbook/plays/${play.id}/export`}>
          Export file (for another venue)
        </a>
        {!play.isTemplate ? (
          <button type="button" className="is-quiet" onClick={() => p.patchPlay({ archived: !play.archived })}>
            {play.archived ? "Unarchive" : "Archive (it's over)"}
          </button>
        ) : null}
        <button
          type="button"
          className="is-danger"
          onClick={async () => {
            if (!window.confirm(`Delete “${play.title}” and everything in it? This can't be undone.`)) return;
            if (await p.run(() => api("DELETE", `/admin/api/playbook/plays/${play.id}`))) router.push("/admin/playbook");
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
