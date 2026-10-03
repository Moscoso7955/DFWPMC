"use client";
import { venuePath } from "@/lib/venue";
import Link from "next/link";
import { useState } from "react";
import type { TicketingSettings } from "@/lib/ticketingTypes";
type Props = {
    initialSettings: TicketingSettings | null;
};
export default function TicketingSettingsEditor({ initialSettings }: Props) {
    const [taxRate, setTaxRate] = useState<string>(initialSettings ? (initialSettings.taxRate * 100).toFixed(3) : "13.475");
    const [holdMinutes, setHoldMinutes] = useState<string>(initialSettings ? String(initialSettings.holdMinutes) : "30");
    const [refundPolicyMd, setRefundPolicyMd] = useState<string>(initialSettings?.refundPolicyMd ?? "");
    const [supportEmail, setSupportEmail] = useState<string>(initialSettings?.supportEmail ?? "");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        setStatus("Saving...");
        try {
            const response = await fetch(venuePath("/ticketing/api/settings"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taxRate: Number(taxRate) / 100,
                    holdMinutes: Number(holdMinutes),
                    refundPolicyMd: refundPolicyMd.trim() || null,
                    supportEmail: supportEmail.trim() || null,
                }),
            });
            const data = (await response.json().catch(() => ({}))) as {
                error?: string;
            };
            if (!response.ok) {
                setStatus(data.error ?? "Save failed.");
                return;
            }
            setStatus("Saved.");
            window.setTimeout(() => setStatus(""), 1200);
        }
        finally {
            setBusy(false);
        }
    };
    return (<section className="ticketing-portal-section">
      <div className="ticketing-portal-crumbs">
        <Link href="/ticketing">← Events</Link>
      </div>

      <div className="ticketing-portal-header-row">
        <div>
          <p className="ticketing-portal-kicker">Settings</p>
          <h1>Ticketing configuration</h1>
          <p className="ticketing-portal-sub">
            These values render in checkout, the confirmation email footer, and on the public event page.
          </p>
        </div>
      </div>

      <div className="ticketing-portal-pane">
        <header className="ticketing-portal-pane-header">
          <h2>Public copy</h2>
        </header>

        <label className="ticketing-portal-field">
          <span>Refund policy</span>
          <textarea rows={8} value={refundPolicyMd} onChange={(e) => setRefundPolicyMd(e.target.value)} placeholder="One paragraph, plain text. Shown in the footer of every event page and in the ticket email. Left blank means only the LLC seller line and links appear."/>
        </label>

        <label className="ticketing-portal-field">
          <span>Support email</span>
          <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Venue support email to be added"/>
        </label>
      </div>

      <div className="ticketing-portal-pane">
        <header className="ticketing-portal-pane-header">
          <h2>Money + inventory</h2>
        </header>

        <div className="ticketing-portal-two">
          <label className="ticketing-portal-field">
            <span>Sales tax rate (percent)</span>
            <input type="number" min={0} max={50} step="0.001" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}/>
          </label>
          <label className="ticketing-portal-field">
            <span>Cart hold (minutes)</span>
            <input type="number" min={30} max={240} value={holdMinutes} onChange={(e) => setHoldMinutes(e.target.value)}/>
          </label>
        </div>

        <p className="ticketing-portal-hint">
          Tax rate is applied to the subtotal after any promo discount, not to the service fee. Cart hold is how
          long a buyer's tickets stay reserved between opening the drawer and completing Stripe checkout —
          Stripe's minimum is 30 minutes.
        </p>
      </div>

      {status ? <p className="ticketing-portal-status">{status}</p> : null}

      <div className="ticketing-portal-actions">
        <button type="button" className="ticketing-portal-primary" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </section>);
}
