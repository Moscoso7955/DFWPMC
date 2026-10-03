"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import type { PromoCode } from "@/lib/ticketingTypes";
import VenueDateTimeField from "../../VenueDateTimeField";
type Props = {
    eventId: string;
    initialPromos: PromoCode[];
};
type PromoDraft = {
    id: string | null;
    code: string;
    discountKind: "percent" | "amount";
    discountValue: string;
    maxUses: string;
    expiresAtLocal: string;
};
const EMPTY_DRAFT: PromoDraft = {
    id: null,
    code: "",
    discountKind: "percent",
    discountValue: "",
    maxUses: "",
    expiresAtLocal: "",
};
function isoToLocalInput(iso: string | null): string {
    if (!iso)
        return "";
    const date = new Date(iso);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
function localInputToIso(value: string): string | null {
    if (!value)
        return null;
    return new Date(value).toISOString();
}
function promoToDraft(promo: PromoCode): PromoDraft {
    return {
        id: promo.id,
        code: promo.code,
        discountKind: promo.percentOff !== null ? "percent" : "amount",
        discountValue: promo.percentOff !== null
            ? String(promo.percentOff)
            : promo.amountOffCents !== null
                ? (promo.amountOffCents / 100).toFixed(2)
                : "",
        maxUses: promo.maxUses !== null ? String(promo.maxUses) : "",
        expiresAtLocal: isoToLocalInput(promo.expiresAt),
    };
}
function formatDiscount(promo: PromoCode): string {
    if (promo.percentOff !== null)
        return `${promo.percentOff}% off`;
    if (promo.amountOffCents !== null)
        return `$${(promo.amountOffCents / 100).toFixed(2)} off`;
    return "";
}
function formatExpiry(iso: string | null): string {
    if (!iso)
        return "";
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "short",
        timeStyle: "short",
    });
}
export default function PromoCodePane({ eventId, initialPromos }: Props) {
    const [promos, setPromos] = useState(initialPromos);
    const [draft, setDraft] = useState<PromoDraft | null>(null);
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const openNew = () => {
        setDraft({ ...EMPTY_DRAFT });
        setStatus("");
    };
    const openEdit = (promo: PromoCode) => {
        setDraft(promoToDraft(promo));
        setStatus("");
    };
    const close = () => setDraft(null);
    const save = async () => {
        if (!draft)
            return;
        if (draft.code.trim().length < 2)
            return setStatus("Code must be at least 2 characters.");
        if (!draft.discountValue.trim())
            return setStatus("Enter a discount value.");
        setBusy(true);
        setStatus(draft.id ? "Saving..." : "Creating...");
        try {
            const percentOff = draft.discountKind === "percent" ? Number(draft.discountValue) : null;
            const amountOffCents = draft.discountKind === "amount"
                ? Math.round(Number(draft.discountValue) * 100)
                : null;
            const url = draft.id
                ? `/ticketing/api/promo-codes/${draft.id}`
                : `/ticketing/api/events/${eventId}/promo-codes`;
            const method = draft.id ? "PATCH" : "POST";
            const response = await fetch(venuePath(url), {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: draft.code.trim().toUpperCase(),
                    percentOff,
                    amountOffCents,
                    maxUses: draft.maxUses.trim() ? Math.floor(Number(draft.maxUses)) : null,
                    expiresAt: localInputToIso(draft.expiresAtLocal),
                }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setStatus(data.error ?? "Save failed.");
                return;
            }
            const data = (await response.json()) as {
                promo: PromoCode;
            };
            if (draft.id) {
                setPromos((current) => current.map((p) => (p.id === data.promo.id ? data.promo : p)));
            }
            else {
                setPromos((current) => [...current, data.promo].sort((a, b) => a.code.localeCompare(b.code)));
            }
            close();
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async (promo: PromoCode) => {
        if (!window.confirm(`Delete promo ${promo.code}?`))
            return;
        const response = await fetch(venuePath(`/ticketing/api/promo-codes/${promo.id}`), { method: "DELETE" });
        if (!response.ok) {
            setStatus("Delete failed.");
            return;
        }
        setPromos((current) => current.filter((p) => p.id !== promo.id));
    };
    return (<section className="ticketing-portal-pane" aria-label="Promo codes">
      <header className="ticketing-portal-pane-header">
        <h2>Promo Codes</h2>
        <button type="button" className="ticketing-portal-primary" onClick={openNew}>
          + Add Promo
        </button>
      </header>

      {promos.length === 0 ? (<p className="ticketing-portal-hint">No promos yet. Add one for an early-bird discount, a friends-and-family code, or a comp-to-comp.</p>) : (<ul className="ticketing-tier-list">
          {promos.map((promo) => (<li key={promo.id} className="ticketing-portal-tier">
              <div className="ticketing-portal-tier-main">
                <div className="ticketing-portal-tier-head">
                  <h3>{promo.code}</h3>
                  <span className="ticketing-portal-tier-price">{formatDiscount(promo)}</span>
                </div>
                <p className="ticketing-portal-tier-stats">
                  {promo.uses} used
                  {promo.maxUses !== null ? ` of ${promo.maxUses}` : ""}
                  {promo.expiresAt ? ` · expires ${formatExpiry(promo.expiresAt)}` : ""}
                </p>
              </div>
              <div className="ticketing-portal-tier-actions">
                <button type="button" onClick={() => openEdit(promo)}>
                  Edit
                </button>
                <button type="button" className="ticketing-portal-danger" onClick={() => remove(promo)} disabled={promo.uses > 0} title={promo.uses > 0 ? "Can't delete a promo that's been used." : ""}>
                  Delete
                </button>
              </div>
            </li>))}
        </ul>)}

      {draft ? (<div className="ticketing-portal-modal" role="dialog" aria-modal="true" aria-label="Promo code">
          <button type="button" className="ticketing-portal-modal-scrim" aria-label="Close" onClick={close}/>
          <div className="ticketing-portal-modal-panel">
            <button type="button" className="ticketing-portal-modal-close" aria-label="Close" onClick={close}>
              ×
            </button>
            <p className="ticketing-portal-kicker">Promo code</p>
            <h2>{draft.id ? "Edit promo" : "New promo"}</h2>

            <label className="ticketing-portal-field">
              <span>Code</span>
              <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="EARLYBIRD"/>
            </label>

            <div className="ticketing-portal-two">
              <label className="ticketing-portal-field">
                <span>Discount kind</span>
                <select value={draft.discountKind} onChange={(e) => setDraft({ ...draft, discountKind: e.target.value as "percent" | "amount" })}>
                  <option value="percent">Percent off</option>
                  <option value="amount">Dollars off</option>
                </select>
              </label>
              <label className="ticketing-portal-field">
                <span>{draft.discountKind === "percent" ? "Percent" : "Dollars"}</span>
                <input type="number" min={0} step={draft.discountKind === "amount" ? "0.01" : "1"} value={draft.discountValue} onChange={(e) => setDraft({ ...draft, discountValue: e.target.value })} placeholder={draft.discountKind === "percent" ? "15" : "10.00"}/>
              </label>
            </div>

            <div className="ticketing-portal-two">
              <label className="ticketing-portal-field">
                <span>Max uses (optional)</span>
                <input type="number" min={1} value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} placeholder="Unlimited"/>
              </label>
              <VenueDateTimeField label="Expires (optional)" value={draft.expiresAtLocal} onChange={(v) => setDraft({ ...draft, expiresAtLocal: v })} defaultTime="23:45"/>
            </div>

            {status ? <p className="ticketing-portal-status">{status}</p> : null}

            <div className="ticketing-portal-actions">
              <button type="button" className="ticketing-portal-primary" onClick={save} disabled={busy}>
                {busy ? "Saving..." : draft.id ? "Save" : "Add"}
              </button>
              <button type="button" className="ticketing-portal-secondary" onClick={close}>
                Cancel
              </button>
            </div>
          </div>
        </div>) : null}
    </section>);
}
