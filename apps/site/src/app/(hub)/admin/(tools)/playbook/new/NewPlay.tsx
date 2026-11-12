"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLAY_KINDS, addDays, daysBetween, shortDate, type Person, type PlayKind, type PlaySummary } from "@/lib/playbookShared";
import { api } from "../playbookClient";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

type Props = { sources: PlaySummary[]; people: Person[]; today: string; initialSource: string };

/**
 * Where a copy lands: a template goes to its next coming date; a real
 * play goes to the following year (Christmas 2026 -> 2027-12-25).
 */
function nextDateFor(source: PlaySummary, today: string) {
  const floor = source.isTemplate ? today : source.targetDate > today ? source.targetDate : today;
  let d = source.targetDate;
  while (d <= floor) d = `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`;
  return d;
}

export default function NewPlay({ sources, people, today, initialSource }: Props) {
  const router = useRouter();
  const initial = sources.find((s) => s.id === initialSource) ?? null;
  const [sourceId, setSourceId] = useState(initial?.id ?? "");
  const source = sources.find((s) => s.id === sourceId) ?? null;
  const [title, setTitle] = useState(initial ? initial.title.replace(/\s*\d{4}$/, "") : "");
  const [kind, setKind] = useState<PlayKind>(initial?.kind ?? "holiday");
  const [targetDate, setTargetDate] = useState(initial ? nextDateFor(initial, today) : addDays(today, 30));
  const [planStart, setPlanStart] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [goal, setGoal] = useState("");
  const [asTemplate, setAsTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (id: string) => {
    setSourceId(id);
    const s = sources.find((x) => x.id === id);
    if (s) {
      setTitle(`${s.title.replace(/\s*\d{4}$/, "")}${s.kind === "holiday" ? ` ${nextDateFor(s, today).slice(0, 4)}` : ""}`);
      setKind(s.kind);
      setTargetDate(nextDateFor(s, today));
      setPlanStart("");
    }
  };

  // A copy keeps its lead time (e.g. planning starts 40 days before).
  const lead = source?.planStart ? daysBetween(source.planStart, source.targetDate) : null;
  const shownStart = planStart || (lead !== null ? addDays(targetDate, -lead) : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await api<{ id: string }>("POST", "/admin/api/playbook/plays", {
        sourceId: sourceId || undefined,
        title,
        kind,
        targetDate,
        planStart: shownStart || null,
        ownerId: ownerId || (sourceId ? undefined : null),
        goal,
        isTemplate: asTemplate,
      });
      router.push(`/admin/playbook/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create it.");
      setBusy(false);
    }
  };

  const templates = sources.filter((s) => s.isTemplate);
  const past = sources.filter((s) => !s.isTemplate);

  return (
    <section className="admin-mailing-list pb">
      <a className="admin-back-link" href="/admin/playbook">
        <span aria-hidden="true">←</span> Playbook
      </a>
      <div className="admin-mailing-list-header">
        <h1>New play</h1>
      </div>
      <form className="admin-pe-form" onSubmit={submit}>
        <fieldset className="admin-pe-wide">
          <legend>Start from</legend>
          <div className="pb-templates">
            <label className={`pb-template${!sourceId ? " is-picked" : ""}`}>
              <input type="radio" name="source" checked={!sourceId} onChange={() => setSourceId("")} />
              <strong>Blank play</strong>
              <span>Start from scratch</span>
              <em>Add phases and tasks yourself</em>
            </label>
            {[...templates, ...past].map((s) => (
              <label key={s.id} className={`pb-template${sourceId === s.id ? " is-picked" : ""}`}>
                <input type="radio" name="source" checked={sourceId === s.id} onChange={() => pick(s.id)} />
                <strong>{s.title}</strong>
                <span>
                  {s.isTemplate ? "Template" : `Copy of ${shortDate(s.targetDate)}`} · {s.total} tasks
                </span>
                <em>{s.isTemplate ? "Dates move to your day" : "Notes for next time come along"}</em>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="admin-pe-wide">
          <span>Name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Christmas 2026" maxLength={120} required />
        </label>
        <label>
          <span>The day it builds to</span>
          <VenueDateTimeField mode="date" tone="light" ariaLabel="The day it builds to" value={targetDate} onChange={setTargetDate} allowClear={false} required />
        </label>
        <label>
          <span>Planning starts (kickoff email)</span>
          <VenueDateTimeField mode="date" tone="light" ariaLabel="Planning starts" value={shownStart} onChange={setPlanStart} marks={targetDate ? { [targetDate]: "the day it builds to" } : undefined} />
        </label>
        <label>
          <span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as PlayKind)}>
            {PLAY_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Owner</span>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">{sourceId ? "Same as the original" : "No owner yet"}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {!sourceId ? (
          <label className="admin-pe-wide">
            <span>Goal</span>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What does a win look like?" maxLength={600} />
          </label>
        ) : null}
        <label className="admin-pe-radio admin-pe-wide">
          <input type="checkbox" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} />
          <span>Save it as a template (for reuse; no emails go out)</span>
        </label>
        <p className="admin-pe-hint admin-pe-wide">
          {source
            ? `Every task keeps its place in the countdown, so “27 days before” lands on ${shortDate(addDays(targetDate, -27))}. Done marks and actual spend start fresh.`
            : "Tasks are planned back from this day; you'll add them on the next screen."}
        </p>
        {error ? (
          <p className="admin-pe-error admin-pe-wide" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-pe-actions admin-pe-wide">
          <button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create play"}
          </button>
        </div>
      </form>
    </section>
  );
}
