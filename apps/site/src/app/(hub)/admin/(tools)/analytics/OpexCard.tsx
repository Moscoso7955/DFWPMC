"use client";

import { useState } from "react";
import type {
  FixedCost,
  FixedPer,
  OpexMonth,
  OpexSummary,
} from "@/lib/opexStore";
import { noteSaved, noteSaveFailed } from "@/app/components/SaveNote";
import VenueDateTimeField from "@/app/components/VenueDateTimeField";

// The Analytics "Operating costs" card: this month so far, last month and
// the year so far, the biggest costs, and an editor for the fixed costs
// (Google Workspace per person, the domain per year, ...).

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type Draft = {
  id?: string;
  name: string;
  per: FixedPer;
  price: string;
  users: string;
  split: string;
};

const toDraft = (c: FixedCost): Draft => ({
  id: c.id,
  name: c.name,
  per: c.per,
  price: c.amountCents ? (c.amountCents / 100).toFixed(2) : "",
  users: String(c.users),
  split: String(c.split ?? 1),
});

function draftMonthly(d: Draft) {
  const price = Number(d.price) || 0;
  const share = Math.max(1, Number(d.split) || 1);
  if (d.per === "year") return price / 12 / share;
  if (d.per === "user") return (price * (Number(d.users) || 0)) / share;
  return price / share;
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
  const [view, setView] = useState<"this" | "last" | "ytd">("this");
  const [editing, setEditing] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [startDraft, setStartDraft] = useState("");
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const month: OpexMonth =
    view === "last"
      ? summary.lastMonth
      : view === "ytd"
        ? summary.ytd
        : summary.thisMonth;
  // Same order every month so the months line up: automatic lines, then fixed costs.
  const sorted = month.lines;
  const TOP = 5;

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/admin/api/opex/refresh", { method: "POST" });
      const body = (await res.json()) as {
        summary?: OpexSummary;
        errors?: string[];
      };
      if (body.summary) setSummary(body.summary);
      if (!res.ok || body.errors?.length)
        setError(
          body.errors?.length
            ? `Couldn't reach: ${body.errors.map((e) => e.split(":")[0]).join(", ")}`
            : "Refresh failed.",
        );
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
        .map((d) => ({
          id: d.id,
          name: d.name,
          per: d.per,
          amountCents: Math.round((Number(d.price) || 0) * 100),
          users: Number(d.users) || 0,
          split: Math.max(1, Number(d.split) || 1),
        }));
      const res = await fetch("/admin/api/opex/fixed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costs, costsStart: startDraft || null }),
      });
      const body = (await res.json()) as {
        summary?: OpexSummary;
        error?: string;
      };
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

  const update = (i: number, patch: Partial<Draft>) =>
    setEditing(
      (rows) => rows && rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    );

  return (
    <article className="admin-analytics-card admin-analytics-card--wide admin-opex">
      <div className="admin-opex-side">
        <h2>Operating costs</h2>
        {summary.issues?.length ? (
          <div className="admin-opex-issues" role="status">
            <strong>
              Check {summary.issues.length === 1 ? "this" : "these"}
            </strong>
            <ul>
              {summary.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="admin-opex-totals">
          {(
            [
              ["this", summary.thisMonth],
              ["last", summary.lastMonth],
              ["ytd", summary.ytd],
            ] as const
          ).map(([key, m]) => (
            <button
              key={key}
              type="button"
              className={
                [view === key ? "is-active" : "", key === "ytd" ? "is-ytd" : ""]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onClick={() => setView(key)}
              aria-pressed={view === key}
            >
              <span>{m.label}</span>
              <strong>{money(m.total)}</strong>
            </button>
          ))}
        </div>
        <ul className="admin-opex-status">
          <li>
            {since(summary.updatedAt)} ·{" "}
            {summary.issues?.length
              ? "see the warning above"
              : "all checks pass"}
          </li>
          {!summary.vercelConnected ? (
            <li>Vercel isn&apos;t connected yet.</li>
          ) : null}
          <li>Yearly costs count as a twelfth each month.</li>
        </ul>
        {error ? (
          <p className="admin-opex-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-opex-actions">
          <button
            type="button"
            onClick={() => {
              setStartDraft(summary.costsStart ?? "");
              setEditing(summary.fixed.map(toDraft));
            }}
            disabled={busy}
          >
            Edit fixed costs
          </button>
          <button
            type="button"
            className="is-quiet"
            onClick={refresh}
            disabled={busy}
          >
            {busy && !editing ? "Updating…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="admin-opex-main">
        <ul
          className={showAll ? "admin-opex-lines is-all" : "admin-opex-lines"}
        >
          {sorted.map((l, i) => (
            <li
              key={l.key}
              className={
                [l.usd === null ? "is-missing" : "", i >= TOP ? "is-extra" : ""]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            >
              <span className="admin-opex-name">
                {l.label}
                <small>
                  {l.detail}
                  {l.how === "estimate" && l.usd !== null ? " · estimate" : ""}
                </small>
              </span>
              <span className="admin-opex-amount">
                {l.usd === null ? "—" : money(l.usd)}
              </span>
            </li>
          ))}
        </ul>
        {sorted.length > TOP ? (
          <button
            type="button"
            className="admin-opex-more"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
          >
            {showAll ? "Show the top 5" : `Show all ${sorted.length} costs`}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Fixed costs"
        >
          <div className="admin-modal-panel admin-modal-panel--wide">
            <button
              className="admin-modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setEditing(null)}
            >
              X
            </button>
            <p className="admin-modal-kicker">Operating costs</p>
            <h2>Fixed costs</h2>
            <p className="admin-opex-help">
              Subscriptions and plans the site pays for. Per-person costs, like
              Google Workspace, multiply the price by the number of people. If a
              bill covers several apps or businesses, put how many in Split and
              only this site&apos;s share counts.
            </p>
            <div className="admin-opex-start">
              <span id="opex-start-label">Count costs from</span>
              <VenueDateTimeField
                mode="date"
                tone="light"
                ariaLabel="Count costs from"
                value={startDraft}
                onChange={setStartDraft}
              />
              <small>
                The year-to-date total starts here. Clear it to start from when
                the site launched.
              </small>
            </div>
            <div className="admin-opex-edit">
              <div className="admin-opex-edit-head" aria-hidden="true">
                <span>Cost</span>
                <span>Price</span>
                <span>Billed</span>
                <span>People</span>
                <span>Split</span>
                <span>A month</span>
                <span />
              </div>
              {editing.map((d, i) => (
                <div className="admin-opex-edit-row" key={d.id ?? `new-${i}`}>
                  <label>
                    <span>Cost</span>
                    <input
                      value={d.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Google Workspace"
                      maxLength={80}
                    />
                  </label>
                  <label>
                    <span>Price</span>
                    <span className="admin-opex-dollar">
                      $
                      <input
                        inputMode="decimal"
                        value={d.price}
                        onChange={(e) =>
                          update(i, {
                            price: e.target.value.replace(/[^0-9.]/g, ""),
                          })
                        }
                        placeholder="0.00"
                      />
                    </span>
                  </label>
                  <label>
                    <span>Billed</span>
                    <select
                      value={d.per}
                      onChange={(e) =>
                        update(i, { per: e.target.value as FixedPer })
                      }
                    >
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
                      onChange={(e) =>
                        update(i, {
                          users: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      disabled={d.per !== "user"}
                      placeholder={d.per === "user" ? "0" : "—"}
                      aria-label={`People on ${d.name || "this cost"}`}
                    />
                  </label>
                  <label>
                    <span>Split</span>
                    <input
                      inputMode="numeric"
                      value={d.split}
                      onChange={(e) =>
                        update(i, {
                          split: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      placeholder="1"
                      aria-label={`Number of apps sharing ${d.name || "this cost"}`}
                      title="How many apps or businesses share this bill"
                    />
                  </label>
                  <span className="admin-opex-monthly">
                    <span>A month</span>
                    {money(draftMonthly(d))}
                  </span>
                  <button
                    type="button"
                    className="admin-opex-remove"
                    onClick={() =>
                      setEditing(
                        (rows) => rows && rows.filter((_, j) => j !== i),
                      )
                    }
                    aria-label={`Remove ${d.name || "this cost"}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="admin-opex-add"
                onClick={() =>
                  setEditing((rows) => [
                    ...(rows ?? []),
                    {
                      name: "",
                      per: "month",
                      price: "",
                      users: "1",
                      split: "1",
                    },
                  ])
                }
              >
                + Add a cost
              </button>
            </div>
            <p className="admin-opex-total-edit">
              Fixed costs:{" "}
              <strong>
                {money(editing.reduce((n, d) => n + draftMonthly(d), 0))}
              </strong>{" "}
              a month
            </p>
            {error ? (
              <p className="admin-opex-error" role="alert">
                {error}
              </p>
            ) : null}
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
