"use client";

import { useState } from "react";
import type { FixedCost, FixedPer, OpexMonth, OpexSummary } from "@/lib/opexStore";
import { noteSaved, noteSaveFailed } from "@/app/components/SaveNote";

// The Analytics "Operating costs" card: this month so far and last month,
// the biggest costs, cost per ticket sold, and an editor for the fixed
// costs (Google Workspace per person, Apple Developer per year, ...).

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Draft = { id?: string; name: string; per: FixedPer; price: string; users: string };

const toDraft = (c: FixedCost): Draft => ({ id: c.id, name: c.name, per: c.per, price: c.amountCents ? (c.amountCents / 100).toFixed(2) : "", users: String(c.users) });

function draftMonthly(d: Draft) {
  const price = Number(d.price) || 0;
  if (d.per === "year") return price / 12;
  if (d.per === "user") return price * (Number(d.users) || 0);
  return price;
}

function since(iso: string | null) {
  if (!iso) return "Not updated yet";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 2) return "Updated just now";
  if (mins < 90) return `Updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `Updated ${hours} h ago`;
  return `Updated ${Math.round(hours / 24)} days ago`;
}

export default function OpexCard({ initial }: { initial: OpexSummary }) {
  const [summary, setSummary] = useState(initial);
  const [showLast, setShowLast] = useState(false);
  const [editing, setEditing] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const month: OpexMonth = showLast ? summary.lastMonth : summary.thisMonth;
  const sorted = [...month.lines].sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  const TOP = 5;
  const lines = showAll ? sorted : sorted.slice(0, TOP);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/admin/api/opex/refresh", { method: "POST" });
      const body = (await res.json()) as { summary?: OpexSummary; errors?: string[] };
      if (body.summary) setSummary(body.summary);
      if (!res.ok || body.errors?.length) setError(body.errors?.length ? `Couldn't reach: ${body.errors.map((e) => e.split(":")[0]).join(", ")}` : "Refresh failed.");
    } catch {
      setError("Refresh failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const costs = editing
        .filter((d) => d.name.trim())
        .map((d) => ({ id: d.id, name: d.name, per: d.per, amountCents: Math.round((Number(d.price) || 0) * 100), users: Number(d.users) || 0 }));
      const res = await fetch("/admin/api/opex/fixed", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ costs }) });
      const body = (await res.json()) as { summary?: OpexSummary; error?: string };
      if (!res.ok || !body.summary) {
        setError(body.error ?? "Couldn't save.");
        noteSaveFailed();
        return;
      }
      setSummary(body.summary);
      setEditing(null);
      noteSaved();
    } catch {
      setError("Couldn't save. Check your connection.");
      noteSaveFailed();
    } finally {
      setBusy(false);
    }
  }

  const update = (i: number, patch: Partial<Draft>) => setEditing((rows) => rows && rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <article className="admin-analytics-card admin-opex">
      <h2>Operating costs</h2>
      <div className="admin-opex-totals">
        <button type="button" className={showLast ? "" : "is-active"} onClick={() => setShowLast(false)} aria-pressed={!showLast}>
          <span>{summary.thisMonth.label}</span>
          <strong>{money(summary.thisMonth.total)}</strong>
        </button>
        <button type="button" className={showLast ? "is-active" : ""} onClick={() => setShowLast(true)} aria-pressed={showLast}>
          <span>{summary.lastMonth.label}</span>
          <strong>{money(summary.lastMonth.total)}</strong>
        </button>
      </div>
      {month.tickets > 0 ? (
        <p className="admin-opex-per">
          {money(month.total / month.tickets)} per ticket sold <span>({month.tickets} tickets)</span>
        </p>
      ) : null}

      <ul className="admin-opex-lines">
        {lines.map((l) => (
          <li key={l.key} className={l.usd === null ? "is-missing" : undefined}>
            <span className="admin-opex-name">
              {l.label}
              <small>
                {l.detail}
                {l.how === "estimate" && l.usd !== null ? " · estimate" : ""}
              </small>
            </span>
            <span className="admin-opex-amount">{l.usd === null ? "—" : money(l.usd)}</span>
          </li>
        ))}
      </ul>
      {sorted.length > TOP ? (
        <button type="button" className="admin-opex-more" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
          {showAll ? "Show the top 5" : `Show all ${sorted.length} costs`}
        </button>
      ) : null}

      <p className="admin-opex-note">
        Fixed costs count in full each month (yearly ones as a twelfth).{" "}
        {!summary.vercelConnected ? "Vercel isn't connected yet. " : ""}
        {summary.anthropicExact ? "" : "Claude is priced from each photo check. "}
        {since(summary.updatedAt)}.
      </p>
      {error ? <p className="admin-opex-error" role="alert">{error}</p> : null}
      <div className="admin-opex-actions">
        <button type="button" onClick={() => setEditing(summary.fixed.map(toDraft))} disabled={busy}>
          Edit fixed costs
        </button>
        <button type="button" className="is-quiet" onClick={refresh} disabled={busy}>
          {busy && !editing ? "Updating…" : "Refresh"}
        </button>
      </div>

      {editing ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Fixed costs">
          <div className="admin-modal-panel admin-modal-panel--wide">
            <button className="admin-modal-close" type="button" aria-label="Close" onClick={() => setEditing(null)}>
              X
            </button>
            <p className="admin-modal-kicker">Operating costs</p>
            <h2>Fixed costs</h2>
            <p className="admin-opex-help">
              Subscriptions and plans the site pays for. Per-person costs, like Google Workspace, multiply the price by the number of people.
            </p>
            <div className="admin-opex-edit">
              <div className="admin-opex-edit-head" aria-hidden="true">
                <span>Cost</span>
                <span>Price</span>
                <span>Billed</span>
                <span>People</span>
                <span>A month</span>
                <span />
              </div>
              {editing.map((d, i) => (
                <div className="admin-opex-edit-row" key={d.id ?? `new-${i}`}>
                  <label>
                    <span>Cost</span>
                    <input value={d.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Google Workspace" maxLength={80} />
                  </label>
                  <label>
                    <span>Price</span>
                    <span className="admin-opex-dollar">
                      $<input inputMode="decimal" value={d.price} onChange={(e) => update(i, { price: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" />
                    </span>
                  </label>
                  <label>
                    <span>Billed</span>
                    <select value={d.per} onChange={(e) => update(i, { per: e.target.value as FixedPer })}>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="user">Per person, monthly</option>
                    </select>
                  </label>
                  <label className={d.per === "user" ? undefined : "is-off"}>
                    <span>People</span>
                    <input
                      inputMode="numeric"
                      value={d.per === "user" ? d.users : ""}
                      onChange={(e) => update(i, { users: e.target.value.replace(/[^0-9]/g, "") })}
                      disabled={d.per !== "user"}
                      placeholder={d.per === "user" ? "0" : "—"}
                      aria-label={`People on ${d.name || "this cost"}`}
                    />
                  </label>
                  <span className="admin-opex-monthly">
                    <span>A month</span>
                    {money(draftMonthly(d))}
                  </span>
                  <button type="button" className="admin-opex-remove" onClick={() => setEditing((rows) => rows && rows.filter((_, j) => j !== i))} aria-label={`Remove ${d.name || "this cost"}`}>
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="admin-opex-add" onClick={() => setEditing((rows) => [...(rows ?? []), { name: "", per: "month", price: "", users: "1" }])}>
                + Add a cost
              </button>
            </div>
            <p className="admin-opex-total-edit">
              Fixed costs: <strong>{money(editing.reduce((n, d) => n + draftMonthly(d), 0))}</strong> a month
            </p>
            {error ? <p className="admin-opex-error" role="alert">{error}</p> : null}
            <div className="admin-modal-actions">
              <button type="button" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
