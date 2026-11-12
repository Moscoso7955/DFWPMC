"use client";

import { useEffect } from "react";

// Every admin pop-up (.admin-modal, .admin-confirm-modal) behaves the same
// way without each one wiring it up: focus moves into it, Tab stays inside
// it, Escape closes it (through its own Close or Cancel button), the page
// behind stops scrolling, and focus goes back where it was afterwards.

const SELECTOR = '.admin-modal[role="dialog"], .admin-confirm-modal[role="dialog"]';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function topModal(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(SELECTOR);
  return all.length ? all[all.length - 1] : null;
}

function focusables(modal: HTMLElement) {
  return [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export default function AdminModalKeys() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let returnTo: HTMLElement | null = null;

    const sync = () => {
      const modal = topModal();
      document.documentElement.classList.toggle("admin-modal-open", Boolean(modal));
      if (modal === current) return;
      if (modal) {
        if (!current) returnTo = document.activeElement as HTMLElement | null;
        current = modal;
        // Start on the first field, or else the first button that isn't Close.
        const items = focusables(modal);
        const first = items.find((el) => el.matches("input, select, textarea")) ?? items.find((el) => !el.classList.contains("admin-modal-close")) ?? items[0];
        first?.focus({ preventScroll: true });
      } else {
        current = null;
        if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
        returnTo = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const modal = topModal();
      if (!modal) return;
      if (e.key === "Escape") {
        const close =
          modal.querySelector<HTMLButtonElement>(".admin-modal-close") ??
          [...modal.querySelectorAll<HTMLButtonElement>("button")].find((b) => /^(cancel|close|no|keep)/i.test(b.textContent?.trim() ?? ""));
        if (close) {
          e.preventDefault();
          close.click();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(modal);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = modal.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKey);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("admin-modal-open");
    };
  }, []);

  return null;
}
