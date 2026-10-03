"use client";
import { venuePath } from "@/lib/venue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TicketedEvent } from "@/lib/ticketingTypes";
import VenueDateTimeField from "./VenueDateTimeField";
type Props = {
    initialEvents: TicketedEvent[];
};
const DEFAULT_DRAFT = {
    title: "",
    startsAt: "",
    ageRestriction: "21+" as TicketedEvent["ageRestriction"],
    capacity: "" as string,
};
const AGE_LABEL: Record<string, string> = {
    "21+": "21+",
    "18+": "18+",
    all_ages: "All ages",
};
function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
    });
}
export default function TicketingEventsList({ initialEvents }: Props) {
    const router = useRouter();
    const [events, setEvents] = useState(initialEvents);
    const [showNew, setShowNew] = useState(false);
    const [draft, setDraft] = useState(DEFAULT_DRAFT);
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const closeModal = () => {
        setShowNew(false);
        setDraft(DEFAULT_DRAFT);
        setStatus("");
    };
    const create = async () => {
        if (!draft.title.trim())
            return setStatus("Title is required.");
        if (!draft.startsAt)
            return setStatus("Start time is required.");
        setSaving(true);
        setStatus("Creating...");
        try {
            const response = await fetch(venuePath("/ticketing/api/events"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: draft.title.trim(),
                    startsAt: new Date(draft.startsAt).toISOString(),
                    ageRestriction: draft.ageRestriction,
                    capacity: draft.capacity === "" ? null : Number(draft.capacity),
                    status: "draft",
                }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setStatus(data.error ?? "Create failed.");
                return;
            }
            const data = (await response.json()) as {
                event: TicketedEvent;
            };
            setEvents((current) => [data.event, ...current]);
            closeModal();
            // Jump straight into the editor so the manager can add tiers.
            router.push(`/ticketing/events/${data.event.id}`);
        }
        finally {
            setSaving(false);
        }
    };
    const upcoming = events
        .filter((e) => e.status !== "past")
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const past = events
        .filter((e) => e.status === "past")
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return (<section className="ticketing-portal-section">
      <div className="ticketing-portal-header-row">
        <div>
          <p className="ticketing-portal-kicker">Events</p>
          <h1>Programming</h1>
          <p className="ticketing-portal-sub">
            {events.length === 0 ? "No events yet." : `${upcoming.length} upcoming · ${past.length} past`}
          </p>
        </div>
        <button type="button" className="ticketing-portal-primary" onClick={() => setShowNew(true)}>
          + New Event
        </button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (<div className="ticketing-portal-empty">
          <p>Nothing on the schedule yet.</p>
          <button type="button" className="ticketing-portal-primary" onClick={() => setShowNew(true)}>
            Create your first event
          </button>
        </div>) : null}

      {upcoming.length > 0 ? (<ul className="ticketing-portal-event-grid">
          {upcoming.map((event) => (<EventCard key={event.id} event={event}/>))}
        </ul>) : null}

      {past.length > 0 ? (<details className="ticketing-portal-past">
          <summary>Past events ({past.length})</summary>
          <ul className="ticketing-portal-event-grid">
            {past.map((event) => (<EventCard key={event.id} event={event}/>))}
          </ul>
        </details>) : null}

      {showNew ? (<div className="ticketing-portal-modal" role="dialog" aria-modal="true" aria-label="New event">
          <button type="button" className="ticketing-portal-modal-scrim" aria-label="Close" onClick={closeModal}/>
          <div className="ticketing-portal-modal-panel">
            <button type="button" className="ticketing-portal-modal-close" aria-label="Close" onClick={closeModal}>
              ×
            </button>
            <p className="ticketing-portal-kicker">New event</p>
            <h2>Set the basics</h2>
            <p className="ticketing-portal-modal-hint">
              You&apos;ll add tiers, description and image on the next screen.
            </p>

            <label className="ticketing-portal-field">
              <span>Title</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Halloween Rooftop"/>
            </label>

            <VenueDateTimeField label="Start (Central time)" value={draft.startsAt} onChange={(v) => setDraft({ ...draft, startsAt: v })} defaultTime="20:00" allowClear={false}/>

            <label className="ticketing-portal-field">
              <span>Age restriction</span>
              <select value={draft.ageRestriction} onChange={(e) => setDraft({ ...draft, ageRestriction: e.target.value as TicketedEvent["ageRestriction"] })}>
                <option value="21+">21+</option>
                <option value="18+">18+</option>
                <option value="all_ages">All ages</option>
              </select>
            </label>

            <label className="ticketing-portal-field">
              <span>Capacity (optional)</span>
              <input type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} placeholder="Sum of tiers if blank"/>
            </label>

            {status ? <p className="ticketing-portal-status">{status}</p> : null}

            <div className="ticketing-portal-actions">
              <button type="button" className="ticketing-portal-primary" onClick={create} disabled={saving}>
                {saving ? "Creating..." : "Create Draft"}
              </button>
              <button type="button" className="ticketing-portal-secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>) : null}
    </section>);
}
function EventCard({ event }: {
    event: TicketedEvent;
}) {
    return (<li>
      <Link href={`/ticketing/events/${event.id}`} className={`ticketing-portal-event ticketing-portal-event--${event.status}`}>
        <div className="ticketing-portal-event-date">
          <span>
            {new Date(event.startsAt).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short" })}
          </span>
          <span>
            {new Date(event.startsAt).toLocaleDateString("en-US", { timeZone: "America/Chicago", day: "numeric" })}
          </span>
        </div>
        <div className="ticketing-portal-event-body">
          <h3>{event.title}</h3>
          <p>{formatDateTime(event.startsAt)}</p>
          <div className="ticketing-portal-event-meta">
            <span className={`ticketing-portal-pill ticketing-portal-pill--${event.status}`}>{event.status}</span>
            <span className="ticketing-portal-pill ticketing-portal-pill--age">{AGE_LABEL[event.ageRestriction] ?? event.ageRestriction}</span>
          </div>
        </div>
        <span aria-hidden="true" className="ticketing-portal-event-arrow">
          →
        </span>
      </Link>
    </li>);
}
