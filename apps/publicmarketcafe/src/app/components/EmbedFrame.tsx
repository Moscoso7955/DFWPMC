"use client";

import { venue } from "@/lib/venue";
import { useEffect, useRef } from "react";

const TIPSY_BOTTOM_BUFFER = 120;
const TIPSY_EMBED_ORIGIN = "https://tipsyapp.io";
const TIPSY_SUBMISSION_TYPE = "tipsy:booking_submitted";

type EmbedFrameProps = {
  embedCode: string;
  emptyMessage?: string;
  onSubmitted?: (bookingId: string) => void;
};

function activateScripts(container: HTMLElement) {
  const scripts = Array.from(container.querySelectorAll("script"));
  for (const oldScript of scripts) {
    const newScript = document.createElement("script");
    for (const attr of Array.from(oldScript.attributes)) {
      newScript.setAttribute(attr.name, attr.value);
    }
    if (oldScript.textContent) newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  }
}

export default function EmbedFrame({
  embedCode,
  emptyMessage = "Embed not configured.",
  onSubmitted,
}: EmbedFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onSubmittedRef = useRef<EmbedFrameProps["onSubmitted"]>(onSubmitted);
  const trimmed = embedCode.trim();

  useEffect(() => {
    onSubmittedRef.current = onSubmitted;
  }, [onSubmitted]);

  useEffect(() => {
    if (venue.localPreview) return;
    const node = wrapRef.current;
    if (!node) return;
    node.innerHTML = trimmed;
    activateScripts(node);
  }, [trimmed]);

  useEffect(() => {
    if (venue.localPreview) return;
    const handleMessage = (event: MessageEvent) => {
      const iframe = wrapRef.current?.querySelector("iframe");
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const type = (data as Record<string, unknown>).type;

      if (type === "tipsy-embed-height") {
        const nextHeight = Number((data as Record<string, unknown>).height);
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
          iframe.style.height = `${nextHeight + TIPSY_BOTTOM_BUFFER}px`;
        }
        return;
      }

      if (event.origin !== TIPSY_EMBED_ORIGIN) return;
      if (type !== TIPSY_SUBMISSION_TYPE) return;

      const bookingId = (data as Record<string, unknown>).bookingId;
      if (typeof bookingId !== "string" || bookingId.length === 0) return;

      onSubmittedRef.current?.(bookingId);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (venue.localPreview) return <div className="embed-empty local-embed-placeholder"><strong>Booking / form connection</strong><p>This form is not connected yet. Your client can add their provider later.</p>{trimmed ? <small>Embed code saved locally; provider loading is paused.</small> : null}</div>;

  if (!trimmed) {
    return <div className="embed-empty">{emptyMessage}</div>;
  }

  return <div className="embed-frame" ref={wrapRef} />;
}
