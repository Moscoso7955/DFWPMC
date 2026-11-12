"use client";

import { useEffect, useState } from "react";

// A small "Saved ✓" note for pages that save as you type (Playbook tabs,
// Roles & access), so there's no doubt an edit was kept. Anything can call
// noteSaved() after a successful save, or noteSaveFailed() when one fails.

const EVENT = "admin:saved";

export function noteSaved() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { ok: true } }));
}

export function noteSaveFailed() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { ok: false } }));
}

export default function SaveNote() {
  const [state, setState] = useState<{ ok: boolean; n: number } | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const on = (e: Event) => {
      const ok = Boolean((e as CustomEvent<{ ok: boolean }>).detail?.ok);
      setState((s) => ({ ok, n: (s?.n ?? 0) + 1 }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setState(null), ok ? 1800 : 5000);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="admin-save-note" role="status" aria-live="polite">
      {state ? (
        <span key={state.n} className={state.ok ? "is-ok" : "is-bad"}>
          {state.ok ? "Saved ✓" : "Didn't save. Try again."}
        </span>
      ) : null}
    </div>
  );
}
