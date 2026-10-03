"use client";

// Start/end pickers for site calendar items. Stores the same text the
// calendar already shows ("9PM-CLOSE", "8PM-11PM", "6:30PM"), which the
// operating-hours filter reads the start time from.

type Props = {
  value: string;
  onChange: (value: string) => void;
};

type End = number | "close" | null;

// 15-minute slots in bar order: noon through 11:45 AM the next morning.
const SLOTS = Array.from({ length: 96 }, (_, i) => (720 + i * 15) % 1440);

function label(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

function compact(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h24 >= 12 ? "PM" : "AM"}`;
}

function parseTime(part: string): number | "close" | null {
  const text = part.trim().toUpperCase();
  if (!text) return null;
  if (text === "CLOSE") return "close";
  if (text === "MIDNIGHT") return 0;
  if (text === "NOON") return 720;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.replace(/\./g, "");
  if (hour > 23 || minute > 59) return null;
  if (suffix === "PM" && hour < 12) hour += 12;
  else if (suffix === "AM" && hour === 12) hour = 0;
  else if (!suffix && hour >= 1 && hour <= 11) hour += 12; // bar hours: bare "9" means 9 PM
  return hour * 60 + minute;
}

export function parseTimeRange(value: string): { start: number | null; end: End } {
  const [startText = "", endText = ""] = value.split(/\s*(?:-|–|—|\bto\b)\s*/i);
  const start = parseTime(startText);
  const end = parseTime(endText);
  return { start: typeof start === "number" ? start : null, end };
}

export function formatTimeRange(start: number | null, end: End): string {
  if (start === null) return "";
  if (end === null) return compact(start);
  return `${compact(start)}-${end === "close" ? "CLOSE" : compact(end)}`;
}

export default function TimeRangePicker({ value, onChange }: Props) {
  const { start, end } = parseTimeRange(value);
  const unreadable = Boolean(value.trim()) && start === null;
  const withCurrent = (slots: number[], current: number | null) =>
    current !== null && !slots.includes(current) ? [current, ...slots] : slots;

  return (
    <div className="admin-time-range">
      <label className="admin-upload-label">
        <span>Start time</span>
        <select
          value={start ?? ""}
          onChange={(e) => onChange(formatTimeRange(e.target.value === "" ? null : Number(e.target.value), end))}
        >
          <option value="">Pick a time</option>
          {withCurrent(SLOTS, start).map((slot) => (
            <option key={slot} value={slot}>
              {label(slot)}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-upload-label">
        <span>End time</span>
        <select
          value={end === null ? "" : String(end)}
          disabled={start === null}
          onChange={(e) => {
            const next = e.target.value;
            onChange(formatTimeRange(start, next === "" ? null : next === "close" ? "close" : Number(next)));
          }}
        >
          <option value="">No end time</option>
          <option value="close">Close</option>
          {withCurrent(SLOTS, typeof end === "number" ? end : null).map((slot) => (
            <option key={slot} value={slot}>
              {label(slot)}
            </option>
          ))}
        </select>
      </label>
      {unreadable ? (
        <p className="admin-time-range-note">Current time &ldquo;{value}&rdquo; isn&apos;t a clock time. Pick one to replace it.</p>
      ) : null}
    </div>
  );
}
