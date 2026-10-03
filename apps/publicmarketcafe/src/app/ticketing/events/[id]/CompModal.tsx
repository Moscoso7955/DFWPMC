"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import type { TicketTier } from "@/lib/ticketingTypes";
type Props = {
    eventId: string;
    tiers: TicketTier[];
    onDone: () => void;
};
export default function CompModal({ eventId, tiers, onDone }: Props) {
    const [tierId, setTierId] = useState<string>(tiers[0]?.id ?? "");
    const [quantity, setQuantity] = useState("1");
    const [buyerName, setBuyerName] = useState("");
    const [buyerEmail, setBuyerEmail] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!tierId)
            return setStatus("Choose a tier.");
        if (!buyerName.trim())
            return setStatus("Enter a name.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))
            return setStatus("Enter a valid email.");
        setBusy(true);
        setStatus("Issuing comp...");
        try {
            const response = await fetch(venuePath(`/ticketing/api/events/${eventId}/comps`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tierId,
                    quantity: Math.max(1, Number(quantity) || 1),
                    buyerName: buyerName.trim(),
                    buyerEmail: buyerEmail.trim(),
                }),
            });
            const data = (await response.json().catch(() => ({}))) as {
                error?: string;
                ticketsIssued?: number;
            };
            if (!response.ok) {
                setStatus(data.error ?? "Comp failed.");
                return;
            }
            setStatus(`Issued ${data.ticketsIssued} ticket${data.ticketsIssued === 1 ? "" : "s"}. Emailed.`);
            window.setTimeout(onDone, 900);
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="ticketing-portal-modal" role="dialog" aria-modal="true" aria-label="Issue comp tickets">
      <button type="button" className="ticketing-portal-modal-scrim" aria-label="Close" onClick={onDone}/>
      <div className="ticketing-portal-modal-panel">
        <button type="button" className="ticketing-portal-modal-close" aria-label="Close" onClick={onDone}>
          ×
        </button>
        <p className="ticketing-portal-kicker">Comps</p>
        <h2>Issue comp tickets</h2>
        <p className="ticketing-portal-modal-hint">
          Creates a $0 order and emails the tickets. Counts against capacity.
        </p>

        <label className="ticketing-portal-field">
          <span>Tier</span>
          <select value={tierId} onChange={(e) => setTierId(e.target.value)}>
            {tiers.map((tier) => (<option key={tier.id} value={tier.id}>
                {tier.name}
              </option>))}
          </select>
        </label>

        <label className="ticketing-portal-field">
          <span>Quantity</span>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)}/>
        </label>

        <label className="ticketing-portal-field">
          <span>Recipient name</span>
          <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)}/>
        </label>

        <label className="ticketing-portal-field">
          <span>Recipient email</span>
          <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="guest@example.com"/>
        </label>

        {status ? <p className="ticketing-portal-status">{status}</p> : null}

        <div className="ticketing-portal-actions">
          <button type="button" className="ticketing-portal-primary" onClick={save} disabled={busy}>
            {busy ? "Issuing..." : "Issue"}
          </button>
          <button type="button" className="ticketing-portal-secondary" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </div>);
}
