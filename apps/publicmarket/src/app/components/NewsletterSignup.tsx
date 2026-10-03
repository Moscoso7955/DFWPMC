"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "Subscription failed. Please try again.");
        return;
      }
      setStatus("success");
      setMessage("You're on the list. Thanks.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Subscription failed. Please try again.");
    }
  };

  return (
    <form className="newsletter-signup" onSubmit={onSubmit} aria-label="Subscribe to Bar Phoebe updates">
      <p className="newsletter-signup-kicker">STAY IN THE LOOP</p>
      <p className="newsletter-signup-copy">Events, openings, and the occasional dispatch from Bar Phoebe.</p>
      <div className="newsletter-signup-row">
        <input
          type="email"
          required
          placeholder="Email address"
          aria-label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "sending" || status === "success"}
        />
        <button type="submit" disabled={status === "sending" || status === "success"}>
          {status === "sending" ? "Joining..." : status === "success" ? "Joined" : "Join"}
        </button>
      </div>
      {message ? (
        <p
          className={`newsletter-signup-status newsletter-signup-status--${status}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
