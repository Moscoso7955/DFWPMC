"use client";

import { useActionState } from "react";
import {
  submitReservation,
  type ReservationFormState,
} from "./actions";

const initialState: ReservationFormState = { status: "idle", message: "" };

const inputClass =
  "w-full rounded-lg border border-charcoal/20 bg-white px-4 py-2.5 text-charcoal placeholder:text-charcoal/40 focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30";

export function ReservationForm() {
  const [state, formAction, pending] = useActionState(
    submitReservation,
    initialState
  );

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-sage/40 bg-sage/10 p-8 text-center">
        <h2 className="font-display text-2xl">Thank you!</h2>
        <p className="mt-2 text-charcoal/80">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Name *</span>
          <input name="name" required placeholder="Your name" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email *</span>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Phone</span>
          <input
            name="phone"
            type="tel"
            placeholder="(555) 555-5555"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Party size *</span>
          <input
            name="party_size"
            type="number"
            min={1}
            max={20}
            defaultValue={2}
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Date *</span>
          <input name="requested_date" type="date" required className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Time *</span>
          <input name="requested_time" type="time" required className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Allergies, special occasions, seating preferences…"
          className={inputClass}
        />
      </label>

      {state.status === "error" && (
        <p className="rounded-lg bg-ember/10 px-4 py-3 text-sm text-ember-dark">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ember px-8 py-3 font-medium text-cream transition-colors hover:bg-ember-dark disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Request reservation"}
      </button>
    </form>
  );
}
