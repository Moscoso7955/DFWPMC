"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Counts a guest page view each time a public page opens (the server
// decides which pages count; admin and staff pages never do).
export default function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || /^\/(admin|blackbook|upload|api|auth)(\/|$)|^\/(willow|madrone|publicmarketcafe)\/(admin|api)(\/|$)/.test(pathname)) return;
    try {
      const body = JSON.stringify({ path: pathname });
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/track-view", blob)) {
        void fetch("/api/track-view", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
      }
    } catch {
      // Never let counting get in the way.
    }
  }, [pathname]);
  return null;
}
