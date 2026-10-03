"use client";

import { useState, type FormEvent } from "react";

type SignupStatus = "idle" | "sending" | "success" | "error";

export default function HomepageNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { ok?: boolean; added?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Please try again in a moment.");
      setStatus("success");
      setMessage(result.added ? "Thank you. You’re on the list for Public Market news and updates." : "You’re already on the list for Public Market news and updates.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn’t save your signup. Please try again later.");
    }
  }

  return (
    <section className="pm-updates" id="updates" aria-labelledby="updates-title">
      <h2 id="updates-title">Follow the restoration process.</h2>
      <p className="pm-updates-copy">Sign up with your email address to receive news and updates.</p>
      <form className="pm-updates-form" onSubmit={submit} aria-label="Public Market updates">
        <label className="sr-only" htmlFor="pm-signup-email">Email address</label>
        <div className="pm-updates-row">
          <input id="pm-signup-email" name="email" type="email" autoComplete="email" required maxLength={254}
            placeholder="Email Address" value={email} disabled={status === "sending"}
            onChange={(event) => { setEmail(event.target.value); if (status !== "sending") { setStatus("idle"); setMessage(""); } }}
            aria-describedby="pm-signup-note pm-signup-status" />
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Signing up…" : status === "success" ? "Signed Up" : "Sign Up"}
          </button>
        </div>
        <p id="pm-signup-note" className="pm-updates-note">News and updates from Fort Worth Public Market.</p>
        <p id="pm-signup-status" className="pm-updates-status" role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}>{message}</p>
      </form>
    </section>
  );
}
