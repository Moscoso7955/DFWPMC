"use client";

import { useState } from "react";
import { hostOf, money, parseMoney, type BudgetLine, type Play } from "@/lib/playbookShared";
import { dollars } from "../playbookClient";
import { InlineInput } from "./Inline";
import type { PlayApi } from "./usePlay";

export default function BudgetTab({ play, p }: { play: Play; p: PlayApi }) {
  const [draft, setDraft] = useState({ category: "", label: "", planned: "" });
  const planned = play.budget.reduce((n, b) => n + (b.plannedCents ?? 0), 0);
  const actual = play.budget.reduce((n, b) => n + (b.actualCents ?? 0), 0);
  const budget = play.budgetCents;
  const categories = [...new Set(play.budget.map((b) => b.category).filter(Boolean))];
  const save = (b: BudgetLine, body: Record<string, unknown>) => p.update("budget", b.id, body);

  return (
    <div className="pb-budget">
      <dl className="admin-customers-totals pb-budget-totals">
        <div>
          <dt>Budget</dt>
          <dd>
            <InlineInput
              className="pb-money-input"
              value={dollars(budget)}
              placeholder="Set it"
              inputMode="decimal"
              aria-label="Total budget"
              onSave={(v) => p.patchPlay({ budgetCents: parseMoney(v) })}
            />
          </dd>
        </div>
        <div>
          <dt>Planned</dt>
          <dd>{money(planned) || "$0"}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{money(actual) || "$0"}</dd>
        </div>
        <div>
          <dt>{budget != null && actual > budget ? "Over by" : "Left"}</dt>
          <dd className={budget != null && actual > budget ? "pb-over" : undefined}>{budget != null ? money(Math.abs(budget - actual)) || "$0" : "—"}</dd>
        </div>
      </dl>
      {budget ? (
        <span className="pb-progress pb-progress--big" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (actual / budget) * 100)}%`, background: actual > budget ? "var(--red)" : undefined }} />
        </span>
      ) : null}

      <div className="pb-table" role="table">
        <div className="pb-table-head" role="row">
          <span>Category</span>
          <span>Item</span>
          <span>Planned</span>
          <span>Spent</span>
          <span>Vendor / link</span>
          <span>Notes</span>
          <span />
        </div>
        {play.budget.map((b) => (
          <div key={b.id} className="pb-table-row" role="row">
            {/* On phones the column headings are hidden, so each field shows its own label. */}
            <span className="pb-cell" data-label="Category">
              <InlineInput value={b.category} list="pb-budget-cats" aria-label="Category" onSave={(v) => save(b, { category: v })} />
            </span>
            <span className="pb-cell" data-label="Item">
              <InlineInput value={b.label} aria-label="Item" onSave={(v) => save(b, { label: v })} />
            </span>
            <span className="pb-cell" data-label="Planned">
              <InlineInput value={dollars(b.plannedCents)} inputMode="decimal" placeholder="$" aria-label="Planned" onSave={(v) => save(b, { plannedCents: parseMoney(v) })} />
            </span>
            <span className="pb-cell" data-label="Spent">
              <InlineInput value={dollars(b.actualCents)} inputMode="decimal" placeholder="$" aria-label="Spent" onSave={(v) => save(b, { actualCents: parseMoney(v) })} />
            </span>
            <span className="pb-vendor" data-label="Vendor / link">
              <InlineInput value={b.vendor} placeholder="Vendor" aria-label="Vendor" onSave={(v) => save(b, { vendor: v })} />
              <InlineInput value={b.url} placeholder="Link" aria-label="Link" onSave={(v) => save(b, { url: v })} />
              {b.url ? (
                <a href={b.url} target="_blank" rel="noreferrer">
                  {hostOf(b.url)} ↗
                </a>
              ) : null}
            </span>
            <span className="pb-cell" data-label="Notes">
              <InlineInput value={b.notes} placeholder="Notes" aria-label="Notes" onSave={(v) => save(b, { notes: v })} />
            </span>
            <button type="button" className="is-quiet pb-remove" aria-label="Remove line" onClick={() => window.confirm(`Remove “${b.label}”?`) && p.remove("budget", b.id)}>
              <span aria-hidden="true">✕</span>
              <span className="pb-remove-word" aria-hidden="true">
                Remove line
              </span>
            </button>
          </div>
        ))}
        <datalist id="pb-budget-cats">
          {[...new Set([...categories, "Decor", "Food & drink", "Marketing", "Staff", "Events", "Supplies"])].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <form
        className="pb-inline-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.label.trim()) return;
          const ok = await p.add("budget", { category: draft.category, label: draft.label, plannedCents: parseMoney(draft.planned), sort: play.budget.length });
          if (ok) setDraft({ category: draft.category, label: "", planned: "" });
        }}
      >
        <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} list="pb-budget-cats" placeholder="Category" />
        <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="What it's for" />
        <input value={draft.planned} onChange={(e) => setDraft({ ...draft, planned: e.target.value })} inputMode="decimal" placeholder="Planned $" />
        <button type="submit" disabled={p.busy}>
          + Add line
        </button>
      </form>
      <p className="admin-pe-hint">Planned is the plan; Spent is what it actually cost. Next year&apos;s copy starts each line at this year&apos;s spend.</p>
    </div>
  );
}
