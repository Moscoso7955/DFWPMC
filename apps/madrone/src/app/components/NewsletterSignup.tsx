"use client";
import { venuePath } from "@/lib/venue";
import { trackNewsletterSignup } from "@/lib/tracking";
import { useState } from "react";
export default function NewsletterSignup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus("sending");
        setMessage("");
        try {
            const response = await fetch(venuePath("/api/newsletter-subscribe"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setStatus("error");
                setMessage(data.error ?? "Subscription failed. Please try again.");
                return;
            }
            setStatus("success");
            trackNewsletterSignup();
            setMessage("Saved to this local preview list.");
            setName("");
            setEmail("");
        }
        catch {
            setStatus("error");
            setMessage("Subscription failed. Please try again.");
        }
    };
    const disabled = status === "sending" || status === "success";
    return (<form className="newsletter-signup" onSubmit={onSubmit} aria-label="Subscribe to Madrone updates">
      <p className="newsletter-signup-kicker">STAY IN THE LOOP</p>
      <p className="newsletter-signup-copy">Events, openings, and the occasional dispatch from Madrone.</p>
      <div className="newsletter-signup-fields">
        <input type="text" required placeholder="Name" aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} disabled={disabled}/>
        <div className="newsletter-signup-row">
          <input type="email" required placeholder="Email address" aria-label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} disabled={disabled}/>
          <button type="submit" disabled={disabled}>
            {status === "sending" ? "Joining..." : status === "success" ? "Joined" : "Join"}
          </button>
        </div>
      </div>
      {message ? (<p className={`newsletter-signup-status newsletter-signup-status--${status}`} role={status === "error" ? "alert" : "status"}>
          {message}
        </p>) : null}
    </form>);
}
