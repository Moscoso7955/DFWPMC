"use client";
import { venuePath } from "@/lib/venue";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Props = {
    orderId: string;
    isPaid: boolean;
    refundable: boolean;
    tickets: Array<{
        id: string;
        token: string;
        status: "valid" | "checked_in" | "void";
    }>;
};
const STATUS_LABEL: Record<string, string> = {
    valid: "Valid",
    checked_in: "Checked in",
    void: "Void",
};
export default function OrderActions({ orderId, isPaid, refundable, tickets }: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState<null | "resend" | "refundFull" | "refundPartial">(null);
    const toggle = (id: string) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const resend = async () => {
        setBusy("resend");
        setStatus("Resending...");
        try {
            const response = await fetch(venuePath(`/ticketing/api/orders/${orderId}/resend-email`), {
                method: "POST",
            });
            const data = (await response.json().catch(() => ({}))) as {
                error?: string;
                sentTo?: string;
            };
            if (!response.ok) {
                setStatus(data.error ?? "Resend failed.");
                return;
            }
            setStatus(`Emailed to ${data.sentTo}.`);
        }
        finally {
            setBusy(null);
        }
    };
    const refund = async (mode: "full" | "partial") => {
        if (mode === "full" && !window.confirm("Refund the entire order? Every ticket will be voided."))
            return;
        if (mode === "partial" && selected.size === 0) {
            setStatus("Select tickets to refund first.");
            return;
        }
        if (mode === "partial" && !window.confirm(`Refund ${selected.size} ticket${selected.size === 1 ? "" : "s"}?`))
            return;
        setBusy(mode === "full" ? "refundFull" : "refundPartial");
        setStatus("Refunding...");
        try {
            const response = await fetch(venuePath(`/ticketing/api/orders/${orderId}/refund`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mode === "full" ? { mode } : { mode, ticketIds: Array.from(selected) }),
            });
            const data = (await response.json().catch(() => ({}))) as {
                error?: string;
                refundedCents?: number;
            };
            if (!response.ok) {
                setStatus(data.error ?? "Refund failed.");
                return;
            }
            setStatus(`Refund issued for $${((data.refundedCents ?? 0) / 100).toFixed(2)}. Reloading...`);
            window.setTimeout(() => router.refresh(), 800);
        }
        finally {
            setBusy(null);
        }
    };
    const partialAvailable = tickets.some((t) => t.status !== "void");
    return (<>
      <ul className="ticketing-tickets-list">
        {tickets.map((ticket) => (<li key={ticket.id} className={`ticketing-ticket-row ticketing-ticket-row--${ticket.status}`}>
            <label>
              <input type="checkbox" disabled={ticket.status === "void"} checked={selected.has(ticket.id)} onChange={() => toggle(ticket.id)}/>
              <span className="ticketing-ticket-token">#{ticket.token.slice(0, 8).toUpperCase()}</span>
            </label>
            <span className="ticketing-ticket-status">{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
          </li>))}
      </ul>

      {status ? <p className="ticketing-portal-status">{status}</p> : null}

      <div className="ticketing-portal-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <button type="button" className="ticketing-portal-secondary" onClick={resend} disabled={!isPaid || busy !== null}>
          {busy === "resend" ? "Resending..." : "Resend ticket email"}
        </button>
        {refundable ? (<>
            <button type="button" className="ticketing-portal-secondary" onClick={() => refund("partial")} disabled={busy !== null || selected.size === 0 || !partialAvailable}>
              {busy === "refundPartial"
                ? "Refunding..."
                : `Refund selected (${selected.size})`}
            </button>
            <button type="button" className="ticketing-portal-secondary ticketing-portal-danger" onClick={() => refund("full")} disabled={busy !== null}>
              {busy === "refundFull" ? "Refunding..." : "Full refund"}
            </button>
          </>) : null}
      </div>
    </>);
}
