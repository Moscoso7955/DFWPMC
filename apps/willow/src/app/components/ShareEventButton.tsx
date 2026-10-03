"use client";

import { venuePath } from "@/lib/venue";
import { useState } from "react";

type Props = {
  path: string;
  title: string;
  text: string;
};

// Native share sheet on phones (iMessage, Instagram, WhatsApp…); copy
// link on desktop. The shared URL is the clean event URL, so the
// recipient gets the flyer link preview.
export default function ShareEventButton({ path, title, text }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${venuePath(path)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // User closed the sheet — nothing to do.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button type="button" className="ticketed-event-badge ticketed-event-share" onClick={share}>
      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v13M7 8l5-5 5 5M5 12v8h14v-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
