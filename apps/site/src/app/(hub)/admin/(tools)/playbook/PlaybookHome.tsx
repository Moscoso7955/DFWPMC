"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DueTask } from "@/lib/playbookStore";
import { daysBetween, money, shortDate, type PlaySummary } from "@/lib/playbookShared";
import { api } from "./playbookClient";

type Props = { plays: PlaySummary[]; due: DueTask[]; today: string; venue: string; canPeople: boolean };

function statusOf(p: PlaySummary, today: string) {
  const until = daysBetween(today, p.targetDate);
  if (p.total > 0 && p.done === p.total) return { label: "Done", cls: "is-done" };
  if (until < -14) return { label: "Past", cls: "is-past" };
  if (p.overdue > 0) return { label: `${p.overdue} late`, cls: "is-at-risk" };
  if (p.planStart && p.planStart > today) return { label: `Starts ${shortDate(p.planStart)}`, cls: "is-recurring" };
  return { label: "On track", cls: "is-on-track" };
}

function whenLine(p: PlaySummary, today: string) {
  const until = daysBetween(today, p.targetDate);
  const day = shortDate(p.targetDate);
  if (until > 0) return `${day} · ${until} day${until === 1 ? "" : "s"} out`;
  if (until === 0) return `${day} · today`;
  return day;
}

export default function PlaybookHome({ plays, due, today, venue, canPeople }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const live = plays.filter((p) => !p.isTemplate && !p.archived);
  const templates = plays.filter((p) => p.isTemplate);
  const archived = plays.filter((p) => !p.isTemplate && p.archived);

  const addStarter = async () => {
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("POST", "/admin/api/playbook/starter");
      router.push(`/admin/playbook/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't add it.");
      setBusy(false);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const parsed = JSON.parse(await file.text());
      const targetDate = window.prompt("What day does it build to? (YYYY-MM-DD)", today);
      if (!targetDate) return;
      const { id } = await api<{ id: string }>("POST", "/admin/api/playbook/import", { file: parsed, targetDate, asTemplate: true });
      router.push(`/admin/playbook/${id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That file didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const card = (p: PlaySummary) => {
    const status = statusOf(p, today);
    const pct = p.total ? (p.done / p.total) * 100 : 0;
    return (
      <li key={p.id}>
        <a href={`/admin/playbook/${p.id}`}>
          <span className="pb-unit-chip">{p.isTemplate ? "Template" : p.kind}</span>
          <strong>{p.title}</strong>
          <span className="pb-meta">
            {p.isTemplate ? `${p.total} tasks` : whenLine(p, today)}
            {p.ownerName ? ` · ${p.ownerName}` : ""}
          </span>
          {!p.isTemplate ? (
            <span className="pb-progress" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
          ) : null}
          <span className="pb-foot">
            <span>{p.isTemplate ? (p.budgetCents ? `Budget ${money(p.budgetCents)}` : "Ready to copy") : `${p.done} of ${p.total} done`}</span>
            {!p.isTemplate ? <span className={`pb-status ${status.cls}`}>{status.label}</span> : null}
          </span>
        </a>
      </li>
    );
  };

  return (
    <section className="admin-mailing-list pb">
      <div className="admin-mailing-list-header">
        <h1>Playbook</h1>
      </div>
      <p className="admin-mailing-list-note">
        How {venue} plans and runs the big things: every holiday, event and launch as a play, counted back from its day,
        with owners, budgets, supplies, look-book photos and emails to management.
      </p>
      <div className="pb-actions">
        <a className="pb-btn" href="/admin/playbook/new">+ New play</a>
        <a className="pb-btn pb-btn--quiet" href="/admin/contacts">Contacts</a>
        {canPeople ? <a className="pb-btn pb-btn--quiet" href="/admin/settings">People</a> : null}
        <button type="button" className="pb-btn pb-btn--quiet" onClick={() => fileRef.current?.click()} disabled={busy}>
          Import a template
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      </div>
      {message ? (
        <p className="admin-photos-warning" role="alert">
          {message}
        </p>
      ) : null}

      {due.length ? (
        <div className="pb-today">
          <h2>Due this week</h2>
          <ul>
            {due.slice(0, 12).map((t) => (
              <li key={t.taskId} className={t.late ? "is-late" : undefined}>
                <a href={`/admin/playbook/${t.playId}`}>{t.title}</a>
                <em>
                  {t.playTitle}
                  {t.owner ? ` · ${t.owner}` : ""} · {t.late ? `was due ${shortDate(t.due)}` : shortDate(t.due)}
                </em>
              </li>
            ))}
          </ul>
          {due.length > 12 ? <p className="pb-more">+ {due.length - 12} more</p> : null}
        </div>
      ) : null}

      <h2 className="admin-photos-section">
        Plays <span className={Number(live.length) ? undefined : "is-zero"}>{live.length}</span>
      </h2>
      {live.length ? (
        <ul className="pb-plays">{live.map(card)}</ul>
      ) : (
        <p className="admin-pe-empty">No plays yet. Start one from a template below, or from scratch.</p>
      )}

      <h2 className="admin-photos-section">
        Templates <span className={Number(templates.length) ? undefined : "is-zero"}>{templates.length}</span>
      </h2>
      {templates.length ? <ul className="pb-plays">{templates.map(card)}</ul> : null}
      {!templates.some((t) => /christmas/i.test(t.title)) ? (
        <button type="button" className="pb-starter" onClick={addStarter} disabled={busy}>
          <strong>+ Add the starter Christmas template</strong>
          <span>51 tasks from kickoff to take-down, planned back from Dec 25, plus budget lines, supplies and key dates. Edit it to fit.</span>
        </button>
      ) : null}

      {archived.length ? (
        <>
          <h2 className="admin-photos-section">
            Past plays <span className={Number(archived.length) ? undefined : "is-zero"}>{archived.length}</span>
          </h2>
          <ul className="pb-plays">{archived.map(card)}</ul>
        </>
      ) : null}
    </section>
  );
}
