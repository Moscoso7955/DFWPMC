// Playbook types and date math, shared by server code and the admin
// screens (no server-only imports).
//
// Every play has a day it builds to (Christmas, a launch, a party). Tasks,
// key dates and the run of show are stored as days before (negative) or
// after (positive) that day, so a play copied to next year, or started
// from a template, lands every date in the right place on its own.

import type { PlayContact } from "./contactsShared";

export type PlayKind = "holiday" | "event" | "project";
export const PLAY_KINDS: { id: PlayKind; label: string }[] = [
  { id: "holiday", label: "Holiday" },
  { id: "event", label: "Event" },
  { id: "project", label: "Project" },
];

export const TEAMS = ["Management", "Bar", "Kitchen", "Front of House", "Marketing", "Events"];

export type Link = { label: string; url: string };

export type Person = { id: string; name: string; email: string; role: "management" | "staff"; active: boolean };

export type Task = {
  id: string;
  phase: string;
  title: string;
  ownerId: string | null;
  ownerLabel: string;
  team: string;
  offsetDays: number;
  dueTime: string;
  notes: string;
  links: Link[];
  costCents: number | null;
  done: boolean;
  doneAt: string | null;
  sort: number;
};

export type BudgetLine = {
  id: string;
  category: string;
  label: string;
  plannedCents: number | null;
  actualCents: number | null;
  vendor: string;
  url: string;
  notes: string;
  sort: number;
};

export type Item = {
  id: string;
  name: string;
  qty: string;
  stored: string;
  url: string;
  costCents: number | null;
  costUnit: string;
  notes: string;
  needsReorder: boolean;
  photo: { thumb: string; view: string } | null;
  photoKey: string | null;
  sort: number;
};

export type LookPhoto = {
  id: string;
  area: string;
  caption: string;
  year: number;
  key: string;
  thumb: string;
  view: string;
  sort: number;
};

export type KeyDate = { id: string; offsetDays: number; kind: "hours" | "party" | "milestone"; label: string; sort: number };
export type RunItem = { id: string; offsetDays: number; timeLabel: string; what: string; sort: number };

export type PlaySummary = {
  id: string;
  title: string;
  kind: PlayKind;
  targetDate: string;
  planStart: string | null;
  ownerName: string;
  isTemplate: boolean;
  archived: boolean;
  total: number;
  done: number;
  overdue: number;
  budgetCents: number | null;
  spentCents: number;
};

export type Play = PlaySummary & {
  ownerId: string | null;
  goal: string;
  notes: string;
  nextTimeNotes: string;
  lastTimeNotes: string;
  kickoffMessage: string;
  emailsEnabled: boolean;
  kickoffSentAt: string | null;
  copiedFrom: string | null;
  tasks: Task[];
  budget: BudgetLine[];
  items: Item[];
  photos: LookPhoto[];
  dates: KeyDate[];
  run: RunItem[];
  contacts: PlayContact[];
};

// ---------------------------------------------------------------------------
// Dates: "YYYY-MM-DD" strings, calendar math at noon UTC so DST can't shift them.
// ---------------------------------------------------------------------------

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

export function todayIn(timeZone: string, now = Date.now()) {
  return new Date(now).toLocaleDateString("en-CA", { timeZone });
}

/** "Sat, Nov 28" */
export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

/** "−27d", "Day of", "+3d" */
export function offsetLabel(offset: number) {
  if (offset === 0) return "Day of";
  return offset < 0 ? `−${-offset}d` : `+${offset}d`;
}

export function dueDate(play: { targetDate: string }, offset: number) {
  return addDays(play.targetDate, offset);
}

/** Tasks grouped into their phases, phases in timeline order. */
export function groupByPhase(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const t of [...tasks].sort((a, b) => a.offsetDays - b.offsetDays || a.sort - b.sort)) {
    const name = t.phase.trim() || "Tasks";
    groups.set(name, [...(groups.get(name) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, tasks: list, from: list[0].offsetDays, to: list[list.length - 1].offsetDays }))
    .sort((a, b) => a.from - b.from);
}

export const money = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 });

/** Accepts "$1,200.50", "1200", "" -> cents or null. */
export function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
