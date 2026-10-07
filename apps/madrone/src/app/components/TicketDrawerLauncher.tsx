"use client";
import { venuePath } from "@/lib/venue";
import { trackBeginCheckout } from "@/lib/tracking";
import { useEffect, useMemo, useState } from "react";
import type { AgeRestriction, PublicTier, TicketingSettings } from "@/lib/ticketingTypes";
type EventInfo = {
    id: string;
    slug: string;
    title: string;
    ageRestriction: AgeRestriction;
};
type Props = {
    event: EventInfo;
    tiers: PublicTier[];
    settings: TicketingSettings | null;
    disabled?: boolean;
    disabledLabel?: string;
};
const AGE_CONFIRM: Record<AgeRestriction, string> = {
    "21+": "I am 21 or older and will present valid photo ID at the door.",
    "18+": "I am 18 or older and will present valid photo ID at the door.",
    all_ages: "",
};
export default function TicketDrawerLauncher({ event, tiers, settings, disabled = false, disabledLabel = "Sold Out", }: Props) {
    const [open, setOpen] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [promoInput, setPromoInput] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [attested, setAttested] = useState(event.ageRestriction === "all_ages");
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);
    const onSaleTiers = useMemo(() => tiers.filter((t) => t.onSale && t.remaining > 0), [tiers]);
    // Seed the cheapest on-sale tier at qty 1 the first time the drawer
    // opens so the buyer doesn't land on a zero-total form and have to
    // hunt for the "+" to actually buy a ticket. Only seeds when
    // nothing is already selected, so a buyer who bumped to 2, closed,
    // and reopened keeps their selection.
    useEffect(() => {
        if (!open)
            return;
        const anySelected = Object.values(quantities).some((q) => q > 0);
        if (anySelected)
            return;
        const cheapest = onSaleTiers.reduce<PublicTier | null>((best, tier) => (best === null || tier.priceCents < best.priceCents ? tier : best), null);
        if (!cheapest)
            return;
        const seedQty = Math.min(1, cheapest.maxPerOrder, cheapest.remaining);
        if (seedQty <= 0)
            return;
        setQuantities((current) => ({ ...current, [cheapest.id]: seedQty }));
    }, [open, onSaleTiers, quantities]);
    const upcomingTiers = useMemo(() => tiers.filter((t) => !t.onSale && t.salesStartAt && new Date(t.salesStartAt) > new Date()), [tiers]);
    const totals = useMemo(() => {
        const taxRate = settings?.taxRate ?? 0.13475;
        const stripePct = settings?.stripePct ?? 0.029;
        const stripeFixed = settings?.stripeFixedCents ?? 30;
        let subtotalRaw = 0;
        for (const tier of tiers) {
            const q = quantities[tier.id] ?? 0;
            if (q > 0)
                subtotalRaw += q * tier.priceCents;
        }
        const subtotal = subtotalRaw;
        const tax = Math.round(subtotal * taxRate);
        const preFee = subtotal + tax;
        let total = subtotal === 0 ? 0 : Math.ceil((preFee + stripeFixed) / (1 - stripePct));
        let serviceFee = subtotal === 0 ? 0 : total - preFee;
        if (subtotal === 0)
            total = 0;
        return { subtotalRaw, subtotal, tax, serviceFee, total };
    }, [quantities, settings, tiers]);
    const anyTicketsSelected = totals.subtotalRaw > 0;
    const needsAge = event.ageRestriction !== "all_ages";
    const canCheckout = anyTicketsSelected && (!needsAge || attested) && name.trim() && email.trim();
    const bump = (tier: PublicTier, delta: number) => {
        setQuantities((current) => {
            const currentQty = current[tier.id] ?? 0;
            const next = Math.max(0, Math.min(tier.maxPerOrder, Math.min(tier.remaining, currentQty + delta)));
            return { ...current, [tier.id]: next };
        });
    };
    const submit = async () => {
        if (!canCheckout || submitting)
            return;
        setSubmitting(true);
        setStatus("Reserving your tickets...");
        const items = tiers
            .map((tier) => ({ tierId: tier.id, quantity: quantities[tier.id] ?? 0 }))
            .filter((row) => row.quantity > 0);
        try {
            const response = await fetch(venuePath("/api/ticketing/checkout"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventSlug: event.slug,
                    items,
                    promoCode: promoInput.trim() || null,
                    buyerName: name.trim(),
                    buyerEmail: email.trim(),
                    buyerPhone: phone.trim() || null,
                    ageAttested: !needsAge || attested,
                    marketingOptIn,
                }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setStatus(data.error ?? "Something went wrong.");
                setSubmitting(false);
                return;
            }
            const data = (await response.json()) as {
                orderId?: string;
                clientSecret?: string;
                free?: boolean;
                redirectUrl?: string;
            };
            // Free/comp order (100% promo) short-circuits Stripe entirely
            // and lands on the confirmation page — same handoff the server
            // built before embedded checkout existed.
            if (data.free && data.redirectUrl) {
                window.location.href = venuePath(data.redirectUrl);
                return;
            }
            // Paid order: hand off to the embedded checkout page under
            // /calendar/<slug>/checkout so Stripe's card form renders inside
            // Madrone chrome rather than sending the buyer off-site.
            if (data.orderId) {
                window.location.href = venuePath(`/calendar/${event.slug}/checkout?order=${data.orderId}`);
                return;
            }
            setStatus("Something went wrong. Please try again.");
            setSubmitting(false);
        }
        catch {
            setStatus("Network error. Please try again.");
            setSubmitting(false);
        }
    };
    return (<>
      <div className="ticketed-event-cta-row">
        <button type="button" className="ticketed-event-cta" onClick={() => { setOpen(true); trackBeginCheckout(event.title); }} disabled={disabled}>
          {disabled ? disabledLabel : "Get Tickets"}
        </button>
        {!disabled ? (<p className="ticketed-event-cta-note">
            {onSaleTiers.length === 1
                ? `${onSaleTiers[0].name} · $${(onSaleTiers[0].priceCents / 100).toFixed(2)}`
                : `${onSaleTiers.length} tiers available`}
          </p>) : null}
      </div>

      {open ? (<div className="ticket-drawer" role="dialog" aria-modal="true" aria-label={`Buy tickets for ${event.title}`}>
          <button className="ticket-drawer-scrim" type="button" aria-label="Close" onClick={() => setOpen(false)}/>
          <div className="ticket-drawer-panel">
            <header className="ticket-drawer-header">
              <div>
                <p className="ticket-drawer-kicker">Buy Tickets</p>
                <h2>{event.title}</h2>
              </div>
              <button type="button" className="ticket-drawer-close" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>

            <div className="ticket-drawer-body">
              <section className="ticket-drawer-tiers" aria-label="Ticket tiers">
                {onSaleTiers.length === 0 ? (<p className="ticket-drawer-empty">Not currently on sale.</p>) : (onSaleTiers.map((tier) => {
                const qty = quantities[tier.id] ?? 0;
                return (<div key={tier.id} className="ticket-tier">
                        <div className="ticket-tier-info">
                          <h3>{tier.name}</h3>
                          {tier.description ? <p>{tier.description}</p> : null}
                          <p className="ticket-tier-meta">
                            ${(tier.priceCents / 100).toFixed(2)}
                            {tier.admitsPerTicket > 1 ? ` · admits ${tier.admitsPerTicket}` : ""}
                            {tier.remaining <= 20 ? ` · ${tier.remaining} left` : ""}
                          </p>
                        </div>
                        <div className="ticket-stepper" role="group" aria-label={`${tier.name} quantity`}>
                          <button type="button" aria-label={`Fewer ${tier.name}`} onClick={() => bump(tier, -1)} disabled={qty === 0}>
                            −
                          </button>
                          <span aria-live="polite">{qty}</span>
                          <button type="button" aria-label={`More ${tier.name}`} onClick={() => bump(tier, 1)} disabled={qty >= Math.min(tier.maxPerOrder, tier.remaining)}>
                            +
                          </button>
                        </div>
                      </div>);
            }))}

                {upcomingTiers.map((tier) => (<div key={tier.id} className="ticket-tier ticket-tier--upcoming">
                    <div className="ticket-tier-info">
                      <h3>{tier.name}</h3>
                      <p className="ticket-tier-meta">
                        Opens{" "}
                        {tier.salesStartAt
                    ? new Date(tier.salesStartAt).toLocaleString("en-US", {
                        timeZone: "America/Chicago",
                        dateStyle: "medium",
                        timeStyle: "short",
                    })
                    : "soon"}
                      </p>
                    </div>
                  </div>))}
              </section>

              <section className="ticket-drawer-form" aria-label="Buyer info">
                <label>
                  <span>Full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"/>
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
                </label>
                <label>
                  <span>Phone (optional)</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(optional)" autoComplete="tel"/>
                </label>
                <label className="ticket-drawer-promo">
                  <span>Promo code (optional)</span>
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code"/>
                </label>
                {needsAge ? (<label className="ticket-drawer-attest">
                    <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)}/>
                    <span>{AGE_CONFIRM[event.ageRestriction]}</span>
                  </label>) : null}

                <label className="ticket-drawer-optin">
                  <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}/>
                  <span>
                    Add me to Madrone&apos;s list for future events, openings and the occasional dispatch.
                  </span>
                </label>
              </section>

              <section className="ticket-drawer-summary" aria-label="Price summary">
                <div className="ticket-summary-row">
                  <span>Tickets</span>
                  <span>${(totals.subtotalRaw / 100).toFixed(2)}</span>
                </div>
                <div className="ticket-summary-row">
                  <span>Service fee</span>
                  <span>${(totals.serviceFee / 100).toFixed(2)}</span>
                </div>
                <div className="ticket-summary-row">
                  <span>Sales tax</span>
                  <span>${(totals.tax / 100).toFixed(2)}</span>
                </div>
                <div className="ticket-summary-row ticket-summary-total">
                  <span>Total</span>
                  <span>${(totals.total / 100).toFixed(2)}</span>
                </div>
                <p className="ticket-summary-note">
                  Final total confirmed at checkout. Promo codes are applied on the next screen.
                </p>
              </section>

              {status ? <p className="ticket-drawer-status">{status}</p> : null}

              <button type="button" className="ticket-drawer-checkout" onClick={submit} disabled={!canCheckout || submitting}>
                {submitting ? "Loading checkout..." : `Continue · $${(totals.total / 100).toFixed(2)}`}
              </button>
              <p className="ticket-drawer-fineprint">Preview checkout. Stripe payments are not connected yet.</p>
            </div>
          </div>
        </div>) : null}
    </>);
}
