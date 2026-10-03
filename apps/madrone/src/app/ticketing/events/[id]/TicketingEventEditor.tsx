"use client";
import { venuePath } from "@/lib/venue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CompModal from "./CompModal";
import PromoCodePane from "./PromoCodePane";
import SongField from "./SongField";
import type { PromoCode, TicketTier, TicketedEvent } from "@/lib/ticketingTypes";
import VenueDateTimeField from "../../VenueDateTimeField";
type Props = {
    initialEvent: TicketedEvent;
    initialTiers: TicketTier[];
    initialPromos: PromoCode[];
};
type EventDraft = {
    title: string;
    slug: string;
    descriptionMd: string;
    imageUrl: string;
    songUrl: string;
    startsAtLocal: string;
    endsAtLocal: string;
    doorsAtLocal: string;
    ageRestriction: TicketedEvent["ageRestriction"];
    capacity: string;
    status: TicketedEvent["status"];
};
type TierDraft = {
    id: string | null;
    name: string;
    description: string;
    priceDollars: string;
    admitsPerTicket: string;
    quantity: string;
    maxPerOrder: string;
    salesStartAtLocal: string;
    salesEndAtLocal: string;
    sortOrder: string;
    isHidden: boolean;
};
const EMPTY_TIER: TierDraft = {
    id: null,
    name: "",
    description: "",
    priceDollars: "",
    admitsPerTicket: "1",
    quantity: "",
    maxPerOrder: "10",
    salesStartAtLocal: "",
    salesEndAtLocal: "",
    sortOrder: "0",
    isHidden: false,
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
function centsFromDollars(value: string): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.round(n * 100);
}
function dollarsFromCents(cents: number): string {
    return (cents / 100).toFixed(2);
}
function tierToDraft(tier: TicketTier): TierDraft {
    return {
        id: tier.id,
        name: tier.name,
        description: tier.description ?? "",
        priceDollars: dollarsFromCents(tier.priceCents),
        admitsPerTicket: String(tier.admitsPerTicket),
        quantity: String(tier.quantity),
        maxPerOrder: String(tier.maxPerOrder),
        salesStartAtLocal: isoToLocalInput(tier.salesStartAt),
        salesEndAtLocal: isoToLocalInput(tier.salesEndAt),
        sortOrder: String(tier.sortOrder),
        isHidden: tier.isHidden,
    };
}
function eventToDraft(event: TicketedEvent): EventDraft {
    return {
        title: event.title,
        slug: event.slug,
        descriptionMd: event.descriptionMd ?? "",
        imageUrl: event.imageUrl ?? "",
        songUrl: event.songUrl ?? "",
        startsAtLocal: isoToLocalInput(event.startsAt),
        endsAtLocal: isoToLocalInput(event.endsAt),
        doorsAtLocal: isoToLocalInput(event.doorsAt),
        ageRestriction: event.ageRestriction,
        capacity: event.capacity === null ? "" : String(event.capacity),
        status: event.status,
    };
}
export default function TicketingEventEditor({ initialEvent, initialTiers, initialPromos }: Props) {
    const router = useRouter();
    const [event, setEvent] = useState(initialEvent);
    const [draft, setDraft] = useState<EventDraft>(eventToDraft(initialEvent));
    const [tiers, setTiers] = useState(initialTiers);
    const [tierDraft, setTierDraft] = useState<TierDraft | null>(null);
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteError, setDeleteError] = useState<{
        message: string;
        canCancel: boolean;
    } | null>(null);
    const [showCompModal, setShowCompModal] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const uploadImage = async (file: File) => {
        setUploadError("");
        setUploadingImage(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const response = await fetch(venuePath("/api/ticketing/upload"), { method: "POST", body: form });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setUploadError(data.error ?? "Upload failed.");
                return;
            }
            const { src } = (await response.json()) as {
                src: string;
            };
            // Stamp the flyer straight into the draft so the preview is
            // instant. Manager still has to hit Save to persist it against
            // the event row.
            setDraft((current) => ({ ...current, imageUrl: src }));
        }
        catch {
            setUploadError("Network error. Please try again.");
        }
        finally {
            setUploadingImage(false);
        }
    };
    const openNewTier = () => {
        setTierDraft({ ...EMPTY_TIER, sortOrder: String(tiers.length) });
        setStatus("");
    };
    const openEditTier = (tier: TicketTier) => {
        setTierDraft(tierToDraft(tier));
        setStatus("");
    };
    const closeTierModal = () => setTierDraft(null);
    const saveEvent = async () => {
        if (!draft.title.trim())
            return setStatus("Title is required.");
        if (!draft.startsAtLocal)
            return setStatus("Start time is required.");
        setSaving(true);
        setStatus("Saving...");
        try {
            const response = await fetch(venuePath(`/ticketing/api/events/${event.id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug: draft.slug.trim() || null,
                    title: draft.title.trim(),
                    descriptionMd: draft.descriptionMd.trim() || null,
                    imageUrl: draft.imageUrl.trim() || null,
                    songUrl: draft.songUrl.trim() || null,
                    startsAt: localInputToIso(draft.startsAtLocal),
                    endsAt: localInputToIso(draft.endsAtLocal),
                    doorsAt: localInputToIso(draft.doorsAtLocal),
                    ageRestriction: draft.ageRestriction,
                    capacity: draft.capacity === "" ? null : Number(draft.capacity),
                    status: draft.status,
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
                event: TicketedEvent;
            };
            setEvent(data.event);
            setDraft(eventToDraft(data.event));
            setStatus("Saved.");
            window.setTimeout(() => setStatus(""), 2400);
        }
        finally {
            setSaving(false);
        }
    };
    const saveTier = async () => {
        if (!tierDraft)
            return;
        if (!tierDraft.name.trim())
            return setStatus("Tier name is required.");
        setSaving(true);
        setStatus(tierDraft.id ? "Saving tier..." : "Creating tier...");
        try {
            const url = tierDraft.id
                ? `/ticketing/api/tiers/${tierDraft.id}`
                : `/ticketing/api/events/${event.id}/tiers`;
            const method = tierDraft.id ? "PATCH" : "POST";
            const response = await fetch(venuePath(url), {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: tierDraft.name.trim(),
                    description: tierDraft.description.trim() || null,
                    priceCents: centsFromDollars(tierDraft.priceDollars),
                    admitsPerTicket: Math.max(1, Number(tierDraft.admitsPerTicket) || 1),
                    quantity: Math.max(0, Number(tierDraft.quantity) || 0),
                    maxPerOrder: Math.max(1, Number(tierDraft.maxPerOrder) || 10),
                    salesStartAt: localInputToIso(tierDraft.salesStartAtLocal),
                    salesEndAt: localInputToIso(tierDraft.salesEndAtLocal),
                    sortOrder: Number(tierDraft.sortOrder) || 0,
                    isHidden: tierDraft.isHidden,
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
                tier: TicketTier;
            };
            if (tierDraft.id) {
                setTiers((current) => current.map((t) => (t.id === data.tier.id ? data.tier : t)));
            }
            else {
                setTiers((current) => [...current, data.tier].sort((a, b) => a.sortOrder - b.sortOrder));
            }
            closeTierModal();
            setStatus("");
        }
        finally {
            setSaving(false);
        }
    };
    const removeTier = async (tierId: string) => {
        if (!window.confirm("Remove this tier?"))
            return;
        const response = await fetch(venuePath(`/ticketing/api/tiers/${tierId}`), { method: "DELETE" });
        if (!response.ok) {
            setStatus("Delete failed.");
            return;
        }
        setTiers((current) => current.filter((t) => t.id !== tierId));
    };
    const duplicate = async () => {
        setSaving(true);
        setStatus("Duplicating...");
        const response = await fetch(venuePath(`/ticketing/api/events/${event.id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "duplicate" }),
        });
        if (!response.ok) {
            setStatus("Duplicate failed.");
            setSaving(false);
            return;
        }
        const data = (await response.json()) as {
            event: TicketedEvent;
        };
        router.push(`/ticketing/events/${data.event.id}`);
    };
    const deleteEvent = async () => {
        setSaving(true);
        setDeleteError(null);
        const response = await fetch(venuePath(`/ticketing/api/events/${event.id}`), { method: "DELETE" });
        if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
                error?: string;
                activeOrders?: number;
            };
            setDeleteError({
                message: data.error ?? "Delete failed. Please try again.",
                canCancel: Boolean(data.activeOrders) && event.status !== "cancelled",
            });
            setSaving(false);
            return;
        }
        router.push("/ticketing");
    };
    const cancelInstead = async () => {
        setSaving(true);
        const response = await fetch(venuePath(`/ticketing/api/events/${event.id}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel" }),
        });
        setSaving(false);
        if (!response.ok) {
            setDeleteError({ message: "Couldn't cancel the event. Please try again.", canCancel: true });
            return;
        }
        const data = (await response.json()) as {
            event: TicketedEvent;
        };
        setEvent(data.event);
        setDraft(eventToDraft(data.event));
        setConfirmingDelete(false);
        setDeleteError(null);
        setStatus("Event cancelled — it's no longer shown on the site.");
        router.refresh();
    };
    const releaseHolds = async () => {
        setStatus("Releasing stuck holds...");
        const response = await fetch(venuePath(`/ticketing/api/events/${event.id}/release-holds`), {
            method: "POST",
        });
        if (!response.ok) {
            setStatus("Could not release holds.");
            return;
        }
        const data = (await response.json()) as {
            released: number;
        };
        setStatus(data.released === 0
            ? "No stuck holds — nothing to release."
            : `Released ${data.released} stuck hold${data.released === 1 ? "" : "s"}.`);
        router.refresh();
    };
    const eventDirty = draft.title !== event.title ||
        (draft.slug || "") !== event.slug ||
        draft.descriptionMd !== (event.descriptionMd ?? "") ||
        draft.imageUrl !== (event.imageUrl ?? "") ||
        draft.songUrl !== (event.songUrl ?? "") ||
        draft.startsAtLocal !== isoToLocalInput(event.startsAt) ||
        draft.endsAtLocal !== isoToLocalInput(event.endsAt) ||
        draft.doorsAtLocal !== isoToLocalInput(event.doorsAt) ||
        draft.ageRestriction !== event.ageRestriction ||
        (draft.capacity === "" ? null : Number(draft.capacity)) !== event.capacity ||
        draft.status !== event.status;
    return (<section className="ticketing-portal-section">
      <div className="ticketing-portal-crumbs">
        <Link href="/ticketing">← Events</Link>
      </div>
      <div className="ticketing-portal-header-row">
        <div>
          <p className="ticketing-portal-kicker">Event</p>
          <h1>{event.title}</h1>
          <p className="ticketing-portal-sub">
            {new Date(event.startsAt).toLocaleString("en-US", {
            timeZone: "America/Chicago",
            dateStyle: "full",
            timeStyle: "short",
        })}
          </p>
        </div>
        <div className="ticketing-portal-actions">
          <a href={venuePath(`/ticketing/events/${event.id}/orders`)} className="ticketing-portal-secondary">
            Orders
          </a>
          <button type="button" className="ticketing-portal-secondary" onClick={duplicate} disabled={saving}>
            Duplicate
          </button>
          <button type="button" className="ticketing-portal-secondary" onClick={releaseHolds} disabled={saving} title="Force-expire every pending order and give the held inventory back. Use when a failed checkout burst left tiers looking sold out.">
            Release stuck holds
          </button>
          <button type="button" className="ticketing-portal-secondary ticketing-portal-danger" onClick={() => setConfirmingDelete(true)} disabled={saving}>
            Delete
          </button>
        </div>
      </div>

      <div className="ticketing-portal-editor-grid">
        <section className="ticketing-portal-pane" aria-label="Details">
          <header className="ticketing-portal-pane-header">
            <h2>Details</h2>
          </header>

          <label className="ticketing-portal-field">
            <span>Title</span>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/>
          </label>

          <label className="ticketing-portal-field">
            <span>Slug</span>
            <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto-generated"/>
          </label>

          <label className="ticketing-portal-field">
            <span>Description</span>
            <textarea rows={4} value={draft.descriptionMd} onChange={(e) => setDraft({ ...draft, descriptionMd: e.target.value })} placeholder="What the night is, what to wear, the vibe."/>
          </label>

          <div className="ticketing-portal-field ticketing-portal-flyer">
            <span>Flyer / hero image</span>
            {draft.imageUrl ? (<div className="ticketing-portal-flyer-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={venuePath(draft.imageUrl)} alt="Event flyer"/>
                <div className="ticketing-portal-flyer-actions">
                  <label className="ticketing-portal-secondary" aria-disabled={uploadingImage}>
                    {uploadingImage ? "Uploading…" : "Replace"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                    uploadImage(file);
                e.target.value = "";
            }} hidden/>
                  </label>
                  <button type="button" className="ticketing-portal-secondary ticketing-portal-danger" onClick={() => setDraft({ ...draft, imageUrl: "" })} disabled={uploadingImage}>
                    Remove
                  </button>
                </div>
              </div>) : (<div className="ticketing-portal-flyer-drop">
                <label className="ticketing-portal-primary" aria-disabled={uploadingImage}>
                  {uploadingImage ? "Uploading…" : "Upload flyer"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                    uploadImage(file);
                e.target.value = "";
            }} hidden/>
                </label>
                <p className="ticketing-portal-flyer-hint">
                  PNG, JPG, WEBP, or SVG · up to 8&nbsp;MB. Best at <strong>4:5</strong> portrait
                  (1080&nbsp;×&nbsp;1350) — the same size as an Instagram post.
                </p>
              </div>)}
            <details className="ticketing-portal-flyer-url">
              <summary>Paste an image URL instead</summary>
              <input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://…"/>
            </details>
            {uploadError ? <p className="ticketing-portal-flyer-error">{uploadError}</p> : null}
          </div>

          <SongField value={draft.songUrl} onChange={(songUrl) => setDraft({ ...draft, songUrl })}/>

          <div className="ticketing-portal-two">
            <VenueDateTimeField label="Doors" value={draft.doorsAtLocal} onChange={(v) => setDraft({ ...draft, doorsAtLocal: v })} defaultTime="19:00"/>
            <VenueDateTimeField label="Starts" value={draft.startsAtLocal} onChange={(v) => setDraft({ ...draft, startsAtLocal: v })} defaultTime="20:00" allowClear={false}/>
          </div>

          <div className="ticketing-portal-two">
            <VenueDateTimeField label="Ends" value={draft.endsAtLocal} onChange={(v) => setDraft({ ...draft, endsAtLocal: v })} defaultTime="23:00"/>
            <label className="ticketing-portal-field">
              <span>Capacity</span>
              <input type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} placeholder="Sum of tiers"/>
            </label>
          </div>

          <div className="ticketing-portal-two">
            <label className="ticketing-portal-field">
              <span>Age restriction</span>
              <select value={draft.ageRestriction} onChange={(e) => setDraft({ ...draft, ageRestriction: e.target.value as TicketedEvent["ageRestriction"] })}>
                <option value="21+">21+</option>
                <option value="18+">18+</option>
                <option value="all_ages">All ages</option>
              </select>
            </label>
            <label className="ticketing-portal-field">
              <span>Status</span>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TicketedEvent["status"] })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="past">Past</option>
              </select>
            </label>
          </div>

          {status ? <p className="ticketing-portal-status">{status}</p> : null}

          <div className="ticketing-portal-actions">
            <button type="button" className="ticketing-portal-primary" onClick={saveEvent} disabled={saving || !eventDirty}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <section className="ticketing-portal-pane" aria-label="Ticket tiers">
          <header className="ticketing-portal-pane-header">
            <h2>Ticket Tiers</h2>
            <div className="ticketing-portal-actions">
              <button type="button" className="ticketing-portal-secondary" onClick={() => setShowCompModal(true)} disabled={tiers.length === 0}>
                Issue comps
              </button>
              <button type="button" className="ticketing-portal-primary" onClick={openNewTier}>
                + Add Tier
              </button>
            </div>
          </header>

          {tiers.length === 0 ? (<p className="ticketing-portal-hint">Add at least one tier so people can buy tickets.</p>) : (<ul className="ticketing-portal-tier-list">
              {tiers.map((tier) => (<li key={tier.id} className={`ticketing-portal-tier${tier.isHidden ? " ticketing-portal-tier--hidden" : ""}`}>
                  <div className="ticketing-portal-tier-main">
                    <div className="ticketing-portal-tier-head">
                      <h3>{tier.name}</h3>
                      <span className="ticketing-portal-tier-price">${dollarsFromCents(tier.priceCents)}</span>
                    </div>
                    <p className="ticketing-portal-tier-stats">
                      {tier.sold} sold · {tier.held} held · {Math.max(0, tier.quantity - tier.sold - tier.held)} left of {tier.quantity}
                    </p>
                    {tier.description ? <p className="ticketing-portal-tier-desc">{tier.description}</p> : null}
                  </div>
                  <div className="ticketing-portal-tier-actions">
                    <button type="button" onClick={() => openEditTier(tier)}>
                      Edit
                    </button>
                    <button type="button" className="ticketing-portal-danger" onClick={() => removeTier(tier.id)} disabled={tier.sold + tier.held > 0} title={tier.sold + tier.held > 0 ? "Can't delete a tier with active sales or holds." : ""}>
                      Delete
                    </button>
                  </div>
                </li>))}
            </ul>)}
        </section>
      </div>

      <PromoCodePane eventId={event.id} initialPromos={initialPromos}/>

      {tierDraft ? (<div className="ticketing-portal-modal" role="dialog" aria-modal="true" aria-label="Tier">
          <button type="button" className="ticketing-portal-modal-scrim" aria-label="Close" onClick={closeTierModal}/>
          <div className="ticketing-portal-modal-panel">
            <button type="button" className="ticketing-portal-modal-close" aria-label="Close" onClick={closeTierModal}>
              ×
            </button>
            <p className="ticketing-portal-kicker">{event.title}</p>
            <h2>{tierDraft.id ? "Edit Tier" : "New Tier"}</h2>

            <label className="ticketing-portal-field">
              <span>Name</span>
              <input value={tierDraft.name} onChange={(e) => setTierDraft({ ...tierDraft, name: e.target.value })} placeholder="GA, VIP, Table for 4"/>
            </label>

            <label className="ticketing-portal-field">
              <span>Description (optional)</span>
              <input value={tierDraft.description} onChange={(e) => setTierDraft({ ...tierDraft, description: e.target.value })}/>
            </label>

            <div className="ticketing-portal-two">
              <label className="ticketing-portal-field">
                <span>Price (USD)</span>
                <input type="number" min={0} step="0.01" value={tierDraft.priceDollars} onChange={(e) => setTierDraft({ ...tierDraft, priceDollars: e.target.value })} placeholder="0.00"/>
              </label>
              <label className="ticketing-portal-field">
                <span>Admits per ticket</span>
                <input type="number" min={1} value={tierDraft.admitsPerTicket} onChange={(e) => setTierDraft({ ...tierDraft, admitsPerTicket: e.target.value })}/>
              </label>
            </div>

            <div className="ticketing-portal-two">
              <label className="ticketing-portal-field">
                <span>Quantity</span>
                <input type="number" min={0} value={tierDraft.quantity} onChange={(e) => setTierDraft({ ...tierDraft, quantity: e.target.value })}/>
              </label>
              <label className="ticketing-portal-field">
                <span>Max per order</span>
                <input type="number" min={1} value={tierDraft.maxPerOrder} onChange={(e) => setTierDraft({ ...tierDraft, maxPerOrder: e.target.value })}/>
              </label>
            </div>

            <div className="ticketing-portal-two">
              <VenueDateTimeField label="Sales start" value={tierDraft.salesStartAtLocal} onChange={(v) => setTierDraft({ ...tierDraft, salesStartAtLocal: v })} defaultTime="10:00"/>
              <VenueDateTimeField label="Sales end" value={tierDraft.salesEndAtLocal} onChange={(v) => setTierDraft({ ...tierDraft, salesEndAtLocal: v })} defaultTime="20:00"/>
            </div>

            <div className="ticketing-portal-two">
              <label className="ticketing-portal-field">
                <span>Sort order</span>
                <input type="number" value={tierDraft.sortOrder} onChange={(e) => setTierDraft({ ...tierDraft, sortOrder: e.target.value })}/>
              </label>
              <label className="ticketing-portal-field">
                <span>Visibility</span>
                <select value={tierDraft.isHidden ? "hidden" : "visible"} onChange={(e) => setTierDraft({ ...tierDraft, isHidden: e.target.value === "hidden" })}>
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
            </div>

            {status ? <p className="ticketing-portal-status">{status}</p> : null}

            <div className="ticketing-portal-actions">
              <button type="button" className="ticketing-portal-primary" onClick={saveTier} disabled={saving}>
                {saving ? "Saving..." : tierDraft.id ? "Save" : "Add Tier"}
              </button>
              <button type="button" className="ticketing-portal-secondary" onClick={closeTierModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>) : null}

      {showCompModal ? (<CompModal eventId={event.id} tiers={tiers} onDone={() => {
                setShowCompModal(false);
                router.refresh();
            }}/>) : null}

      {confirmingDelete ? (<div className="ticketing-portal-modal" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <button type="button" className="ticketing-portal-modal-scrim" aria-label="Close" onClick={() => setConfirmingDelete(false)}/>
          <div className="ticketing-portal-modal-panel">
            <p className="ticketing-portal-kicker">Delete event</p>
            <h2>Delete {event.title}?</h2>
            <p>
              This permanently removes the event, its tiers and promo codes, and any abandoned or fully refunded
              orders. Events with paid orders can&apos;t be deleted — cancel them instead.
            </p>
            {deleteError ? (<p className="ticketing-portal-modal-error" role="alert">
                {deleteError.message}
              </p>) : null}
            <div className="ticketing-portal-actions">
              {deleteError?.canCancel ? (<button type="button" className="ticketing-portal-primary ticketing-portal-danger" onClick={cancelInstead} disabled={saving}>
                  {saving ? "Cancelling…" : "Cancel event instead"}
                </button>) : (<button type="button" className="ticketing-portal-primary ticketing-portal-danger" onClick={deleteEvent} disabled={saving}>
                  {saving ? "Deleting…" : "Yes, delete"}
                </button>)}
              <button type="button" className="ticketing-portal-secondary" onClick={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
            }}>
                Keep event
              </button>
            </div>
          </div>
        </div>) : null}
    </section>);
}
