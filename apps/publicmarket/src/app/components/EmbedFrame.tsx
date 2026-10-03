"use client";

import { useEffect, useRef } from "react";

const TIPSY_BOTTOM_BUFFER = 120;

type EmbedFrameProps = {
  embedCode: string;
  emptyMessage?: string;
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

export default function EmbedFrame({ embedCode, emptyMessage = "Embed not configured." }: EmbedFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trimmed = embedCode.trim();

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    node.innerHTML = trimmed;
    activateScripts(node);
  }, [trimmed]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframe = wrapRef.current?.querySelector("iframe");
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== "tipsy-embed-height") return;
      const nextHeight = Number(data.height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        iframe.style.height = `${nextHeight + TIPSY_BOTTOM_BUFFER}px`;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!trimmed) {
    return <div className="embed-empty">{emptyMessage}</div>;
  }

  return <div className="embed-frame" ref={wrapRef} />;
}
