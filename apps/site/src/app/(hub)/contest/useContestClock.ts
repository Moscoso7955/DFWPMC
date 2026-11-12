"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ContestTimes } from "@/lib/contestShared";

const DEVICE_KEY = "pm-device";

/** Reloads the page's data the moment a window opens or closes. */
export function useContestClock(times: ContestTimes | null) {
  const router = useRouter();
  useEffect(() => {
    if (!times) return;
    const now = Date.now();
    const next = Object.values(times)
      .map((t) => Date.parse(t) - now)
      .filter((ms) => ms > 0 && ms < 6 * 3600 * 1000)
      .sort((a, b) => a - b)[0];
    if (next === undefined) return;
    const timer = window.setTimeout(() => router.refresh(), next + 1500);
    return () => window.clearTimeout(timer);
  }, [times, router]);
}

export function storedDevice(): string | null {
  try {
    return window.localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

export function rememberDevice(token: unknown) {
  if (typeof token !== "string") return;
  try {
    window.localStorage.setItem(DEVICE_KEY, token);
  } catch {}
}
