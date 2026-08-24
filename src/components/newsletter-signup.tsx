"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-6 text-sm text-glow">
        You&apos;re on the list — see you at the market.
      </p>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <form onSubmit={submit} className="flex gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 rounded-full border border-cream/20 bg-transparent px-5 py-2.5 text-sm text-cream placeholder:text-cream/40 focus:border-glow focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full border border-glow/60 px-5 py-2.5 text-sm text-glow transition-colors hover:bg-glow/10 disabled:opacity-50"
        >
          {status === "sending" ? "Joining…" : "Join"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-3 text-xs text-cream/60">
          That didn&apos;t go through — please try again in a moment.
        </p>
      )}
    </div>
  );
}
