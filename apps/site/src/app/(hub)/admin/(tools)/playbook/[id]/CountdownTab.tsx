"use client";

import { useState } from "react";
import {
  TEAMS,
  addDays,
  daysBetween,
  groupByPhase,
  hostOf,
  money,
  offsetLabel,
  parseMoney,
  shortDate,
  type Link,
  type Person,
  type Play,
  type Task,
} from "@/lib/playbookShared";
import { dollars } from "../playbookClient";
import type { PlayApi } from "./usePlay";
import type { Contact } from "@/lib/contactsShared";
import ContactsPicker from "./ContactsPicker";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

type Props = { play: Play; people: Person[]; today: string; p: PlayApi; contacts: Contact[]; canContacts: boolean };

type Draft = Omit<Task, "id" | "done" | "doneAt" | "sort"> & { id?: string };

const blank = (phase: string, offsetDays: number): Draft => ({
  phase,
  title: "",
  ownerId: null,
  ownerLabel: "",
  team: "",
  offsetDays,
  dueTime: "",
  notes: "",
  links: [],
  costCents: null,
});

type EditorProps = { play: Play; people: Person[]; draft: Draft; phases: string[]; p: PlayApi; onClose: () => void; contacts: Contact[]; canContacts: boolean };

function TaskEditor({ play, people, draft: initial, phases, p, onClose, contacts, canContacts }: EditorProps) {
  const [d, setD] = useState(initial);
  const [cost, setCost] = useState(dollars(initial.costCents));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const due = addDays(play.targetDate, d.offsetDays);
  const ownerValue = d.ownerId ?? (d.ownerLabel ? "__other" : "");

  const save = async () => {
    const body = { ...d, costCents: parseMoney(cost) };
    const ok = d.id ? await p.update("tasks", d.id, body) : await p.add("tasks", body);
    if (ok) onClose();
  };
  const setLink = (i: number, patch: Partial<Link>) => set("links", d.links.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="pb-editor">
      <label className="pb-editor-wide">
        <span>Task</span>
        <input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" autoFocus />
      </label>
      <label>
        <span>Due</span>
        <VenueDateTimeField mode="date" tone="light" ariaLabel="Due" value={due} allowClear={false} marks={{ [play.targetDate]: "the day it builds to" }} onChange={(v) => v && set("offsetDays", daysBetween(play.targetDate, v))} />
        <small>{offsetLabel(d.offsetDays)} from the day</small>
      </label>
      <label>
        <span>Time (optional)</span>
        <input value={d.dueTime} onChange={(e) => set("dueTime", e.target.value)} placeholder="e.g. 8:00 PM" />
      </label>
      <label>
        <span>Phase</span>
        <input value={d.phase} onChange={(e) => set("phase", e.target.value)} list="pb-phases" placeholder="e.g. 4 weeks out" />
        <datalist id="pb-phases">
          {phases.map((ph) => (
            <option key={ph} value={ph} />
          ))}
        </datalist>
      </label>
      <label>
        <span>Team</span>
        <input value={d.team} onChange={(e) => set("team", e.target.value)} list="pb-teams" />
        <datalist id="pb-teams">
          {TEAMS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label>
        <span>Owner</span>
        <select
          value={ownerValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__other") setD((x) => ({ ...x, ownerId: null }));
            else setD((x) => ({ ...x, ownerId: v || null, ownerLabel: "" }));
          }}
        >
          <option value="">No one yet</option>
          {people.filter((x) => x.active).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
          <option value="__other">Someone else…</option>
        </select>
        {ownerValue === "__other" ? <input value={d.ownerLabel} onChange={(e) => set("ownerLabel", e.target.value)} placeholder="Name or role" /> : null}
      </label>
      <label>
        <span>Cost (optional)</span>
        <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="$" />
      </label>
      <label className="pb-editor-wide">
        <span>Notes</span>
        <textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="How to do it, who to call, what went wrong last time…" />
      </label>
      {d.id ? (
        <div className="pb-editor-wide pb-contacts-edit">
          <span>Contacts</span>
          <ContactsPicker
            playId={play.id}
            taskId={d.id}
            attached={play.contacts.filter((c) => c.taskId === d.id)}
            all={contacts}
            canEdit={canContacts}
            p={p}
          />
        </div>
      ) : null}
      <div className="pb-editor-wide pb-links-edit">
        <span>Links</span>
        {d.links.map((l, i) => (
          <div key={i}>
            <input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Label" />
            <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://…" />
            <button type="button" className="is-quiet" onClick={() => set("links", d.links.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="is-quiet" onClick={() => set("links", [...d.links, { label: "", url: "" }])}>
          + Add a link
        </button>
      </div>
      <div className="pb-editor-wide pb-editor-actions">
        <button type="button" onClick={save} disabled={p.busy || !d.title.trim()}>
          {d.id ? "Save" : "Add task"}
        </button>
        <button type="button" className="is-quiet" onClick={onClose}>
          Cancel
        </button>
        {d.id ? (
          <button
            type="button"
            className="is-danger"
            onClick={async () => {
              if (window.confirm("Delete this task?") && (await p.remove("tasks", d.id!)) !== null) onClose();
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function CountdownTab({ play, people, today, p, contacts, canContacts }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [team, setTeam] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const teams = [...new Set(play.tasks.map((t) => t.team).filter(Boolean))];
  const shown = play.tasks.filter((t) => (!team || t.team === team) && (!hideDone || !t.done));
  const phases = groupByPhase(shown);
  const allPhases = groupByPhase(play.tasks).map((g) => g.name);
  const ownerOf = (t: Task) => people.find((x) => x.id === t.ownerId)?.name ?? t.ownerLabel;
  const keyDates = [...play.dates].sort((a, b) => a.offsetDays - b.offsetDays);

  const editor = (match: (d: Draft) => boolean) =>
    editing && match(editing) ? (
      <TaskEditor play={play} people={people} draft={editing} phases={allPhases} p={p} onClose={() => setEditing(null)} contacts={contacts} canContacts={canContacts} />
    ) : null;
  const taskContacts = (taskId: string) => play.contacts.filter((c) => c.taskId === taskId).map((c) => c.contact.name);

  return (
    <div className="pb-cols">
      <div className="pb-phases">
        <div className="pb-filters">
          <button type="button" className={!team ? "is-active" : undefined} onClick={() => setTeam("")}>
            Everyone
          </button>
          {teams.map((t) => (
            <button key={t} type="button" className={team === t ? "is-active" : undefined} onClick={() => setTeam(t)}>
              {t}
            </button>
          ))}
          <label>
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done
          </label>
        </div>

        {phases.length === 0 ? <p className="admin-pe-empty">No tasks yet. Add the first one below.</p> : null}
        {phases.map((phase) => (
          <section key={phase.name} className="pb-phase">
            <h2>
              {phase.name}
              <span>
                {phase.from === phase.to
                  ? shortDate(addDays(play.targetDate, phase.from))
                  : `${shortDate(addDays(play.targetDate, phase.from))} – ${shortDate(addDays(play.targetDate, phase.to))}`}
                {" · "}
                {phase.tasks.length} task{phase.tasks.length === 1 ? "" : "s"}
              </span>
            </h2>
            <ul>
              {phase.tasks.map((t) => {
                const due = addDays(play.targetDate, t.offsetDays);
                const late = !t.done && !play.isTemplate && due < today;
                if (editing?.id === t.id) return <li key={t.id} className="pb-editing">{editor((d) => d.id === t.id)}</li>;
                return (
                  <li key={t.id} className={`${t.done ? "is-done" : ""}${late ? " is-late" : ""}`.trim() || undefined}>
                    <button
                      type="button"
                      className="pb-check"
                      aria-label={t.done ? "Mark not done" : "Mark done"}
                      onClick={() => p.update("tasks", t.id, { done: !t.done })}
                    >
                      {t.done ? "✓" : ""}
                    </button>
                    <button type="button" className="pb-task" onClick={() => setEditing({ ...t })}>
                      {t.title}
                      <em>
                        {t.team}
                        {taskContacts(t.id).length ? ` · 📇 ${taskContacts(t.id).join(", ")}` : ""}
                        {t.links.length ? ` · 🔗 ${t.links.length}` : ""}
                        {t.notes ? " · 📝" : ""}
                        {t.costCents ? ` · ${money(t.costCents)}` : ""}
                      </em>
                    </button>
                    <span className="pb-who">{ownerOf(t)}</span>
                    <span className="pb-due">
                      <b className="pb-offset">{offsetLabel(t.offsetDays)}</b> {late ? "Late · " : ""}
                      {shortDate(due)}
                      {t.dueTime ? ` · ${t.dueTime}` : ""}
                    </span>
                  </li>
                );
              })}
              {editing && !editing.id && editing.phase === phase.name ? <li className="pb-editing">{editor((d) => !d.id && d.phase === phase.name)}</li> : null}
              <li className="pb-add">
                <button type="button" onClick={() => setEditing(blank(phase.name, phase.to))}>
                  + Add task
                </button>
              </li>
            </ul>
          </section>
        ))}
        {editing && !editing.id && !phases.some((ph) => ph.name === editing.phase) ? <div className="pb-editing">{editor((d) => !d.id)}</div> : null}
        <button type="button" className="pb-add pb-add--block" onClick={() => setEditing(blank("", 0))}>
          + Add a task in a new phase
        </button>
      </div>

      <aside className="pb-ros">
        <h2>
          Contacts <span>{new Set(play.contacts.map((c) => c.contact.id)).size}</span>
        </h2>
        <ContactsPicker
          playId={play.id}
          taskId={null}
          attached={play.contacts.filter((c) => c.taskId === null)}
          all={contacts}
          canEdit={canContacts}
          p={p}
        />
        {play.contacts.some((c) => c.taskId) ? (
          <ol className="pb-task-contacts">
            {play.contacts
              .filter((c) => c.taskId)
              .map((c) => (
                <li key={c.linkId}>
                  <b>{c.contact.what || c.contact.company || "Task"}</b>
                  <span>
                    {c.contact.name}
                    {c.contact.phone ? (
                      <>
                        {" · "}
                        <a href={`tel:${c.contact.phone.replace(/[^\d+]/g, "")}`}>{c.contact.phone}</a>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
          </ol>
        ) : null}
        <h2 className="pb-notes-h">
          Key dates <span>{keyDates.length}</span>
        </h2>
        {keyDates.length ? (
          <ol>
            {keyDates.map((d) => (
              <li key={d.id}>
                <b>{shortDate(addDays(play.targetDate, d.offsetDays))}</b>
                <span>
                  {d.kind === "hours" ? "🕑 " : d.kind === "party" ? "🎉 " : ""}
                  {d.label}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="pb-notes">Close dates, special hours and parties go here (Dates & notes).</p>
        )}
        {play.lastTimeNotes ? (
          <>
            <h2 className="pb-notes-h">Notes from last time</h2>
            <p className="pb-notes">{play.lastTimeNotes}</p>
          </>
        ) : null}
        {play.items.some((i) => i.needsReorder) ? (
          <>
            <h2 className="pb-notes-h">To reorder</h2>
            <ul className="pb-reorder">
              {play.items
                .filter((i) => i.needsReorder)
                .map((i) => (
                  <li key={i.id}>
                    {i.name}
                    {i.url ? (
                      <a href={i.url} target="_blank" rel="noreferrer">
                        {hostOf(i.url)} ↗
                      </a>
                    ) : null}
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </aside>
    </div>
  );
}
