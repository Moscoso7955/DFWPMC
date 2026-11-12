"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The venue date and time pickers, built the way Tipsy's staff pickers
// work, in brand colors:
//   date      a button reading "Nov 6, 2026" that opens a small month
//             popover; tapping a day picks it and closes.
//   time      three selects, hour : minute AM/PM, in 15-minute steps, so
//             phones show their own wheel. Optional ✕ to clear.
//   datetime  both side by side.
// Values are the strings the browser inputs used, so saving is unchanged:
//   date "YYYY-MM-DD", time "HH:mm" (24-hour), datetime "YYYY-MM-DDTHH:mm".
// tone "dark" is the ticketing portal; "light" is the cream admin pages.

type Mode = "datetime" | "date" | "time";

type Props = {
  mode?: Mode;
  /** Visible label above the field (ticketing style). Omit when the caller wraps it in its own <label>. */
  label?: string;
  /** Accessible name when there's no visible label from this component. */
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show ✕ to empty the value. Required fields pass false. */
  allowClear?: boolean;
  /** Time used when a date is picked before a time (datetime mode). */
  defaultTime?: string;
  tone?: "dark" | "light";
  required?: boolean;
  disabled?: boolean;
  /** Minutes between choices; 60 drops the minute select. */
  minuteStep?: number;
  /** Earliest day that can be picked, "YYYY-MM-DD". */
  min?: string;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function splitValue(value: string, mode: Mode): { date: string; time: string } {
  if (mode === "date") return { date: /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "", time: "" };
  if (mode === "time") return { date: "", time: /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : "" };
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? { date: m[1], time: m[2] } : { date: "", time: "" };
}

// ---------------------------------------------------------------------------
// Escape closes only the topmost picker, never the modal around it.
// ---------------------------------------------------------------------------

const escapeStack: (() => void)[] = [];
let escapeListening = false;
function onEscape(e: KeyboardEvent) {
  if (e.key !== "Escape" || escapeStack.length === 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  escapeStack[escapeStack.length - 1]();
}
function pushEscape(close: () => void) {
  escapeStack.push(close);
  if (!escapeListening) {
    window.addEventListener("keydown", onEscape, true);
    escapeListening = true;
  }
  return () => {
    const i = escapeStack.lastIndexOf(close);
    if (i >= 0) escapeStack.splice(i, 1);
  };
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

type DateProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  labelledBy?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
};

export function VenueDatePicker({ value, onChange, placeholder = "Select date", ariaLabel, labelledBy, required, disabled, min }: DateProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const selected = fromKey(value);
  const [month, setMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Outside clicks and Escape close it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    const pop = pushEscape(() => {
      setOpen(false);
      triggerRef.current?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      pop();
    };
  }, [open]);

  // Portaled to <body> with fixed positioning so scrolling modals can't
  // clip it: 4px under the field, left-aligned, slid sideways to stay 8px
  // inside the screen, and flipped above when there's no room below.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const edge = 8;
      const left = Math.max(edge, Math.min(rect.left, window.innerWidth - panel.offsetWidth - edge));
      let top = rect.bottom + 4;
      if (top + panel.offsetHeight > window.innerHeight - edge) {
        const above = rect.top - 4 - panel.offsetHeight;
        top = above >= edge ? above : Math.max(edge, window.innerHeight - edge - panel.offsetHeight);
      }
      setPosition({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (!open && selected) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen((o) => !o);
  };

  const shown = selected ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const todayKey = dateKey(new Date());
  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  return (
    <div className="venue-date" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`venue-date-trigger${shown ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labelledBy ? undefined : `${ariaLabel ?? "Date"}: ${shown || placeholder}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}-value` : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <span id={`${id}-value`}>{shown || placeholder}</span>
      </button>
      {required ? (
        // Lets the browser's own "please fill in this field" stop the form.
        <input
          className="venue-picker-required"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
        />
      ) : null}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="venue-date-panel"
              role="dialog"
              aria-label={`${ariaLabel ?? "Date"}: choose a day`}
              style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
            >
              <div className="venue-date-head">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  ‹
                </button>
                <strong>{month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</strong>
                <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                  ›
                </button>
              </div>
              <div className="venue-date-grid">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="venue-date-dow" aria-hidden="true">
                    {d}
                  </span>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <span key={`blank-${i}`} />;
                  const key = dateKey(day);
                  const isSelected = key === value;
                  const tooEarly = Boolean(min) && key < (min as string);
                  return (
                    <button
                      type="button"
                      key={key}
                      disabled={tooEarly}
                      className={`venue-date-day${isSelected ? " is-selected" : ""}${key === todayKey ? " is-today" : ""}`}
                      aria-pressed={isSelected}
                      aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      onClick={() => {
                        onChange(key);
                        setOpen(false);
                        triggerRef.current?.focus();
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

type TimeProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  allowClear?: boolean;
  required?: boolean;
  disabled?: boolean;
  minuteStep?: number;
};

/** "HH:mm" → hour 1–12, minute snapped to the step, AM/PM. */
function toParts(value: string, step: number): { hour: string; minute: string; period: string } {
  const m = /^(\d{2}):(\d{2})/.exec(value);
  if (!m) return { hour: "", minute: "", period: "" };
  let total = Number(m[1]) * 60 + Number(m[2]);
  total = (Math.round(total / step) * step) % 1440;
  const h24 = Math.floor(total / 60);
  return { hour: String(h24 % 12 === 0 ? 12 : h24 % 12), minute: pad(total % 60), period: h24 >= 12 ? "PM" : "AM" };
}

function toTime24(hour: string, minute: string, period: string): string {
  const h = Number(hour) % 12;
  return `${pad(period === "PM" ? h + 12 : h)}:${minute}`;
}

export function VenueTimePicker({ value, onChange, ariaLabel = "Time", allowClear = true, required, disabled, minuteStep = 15 }: TimeProps) {
  const parts = toParts(value, minuteStep);
  const minutes = Array.from({ length: Math.max(1, Math.floor(60 / minuteStep)) }, (_, i) => pad(i * minuteStep));
  // Picking one part fills the others (on the hour, evening) so it's a real time straight away.
  const set = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    if (!next.hour) return;
    onChange(toTime24(next.hour, next.minute || "00", next.period || "PM"));
  };

  return (
    <div className="venue-time" role="group" aria-label={ariaLabel}>
      {allowClear && value && !disabled ? (
        <button type="button" className="venue-time-clear" aria-label={`Clear ${ariaLabel.toLowerCase()}`} onClick={() => onChange("")}>
          ✕
        </button>
      ) : null}
      <select
        className="venue-time-select"
        aria-label={`${ariaLabel} hour`}
        value={parts.hour}
        required={required}
        disabled={disabled}
        onChange={(e) => set({ hour: e.target.value })}
      >
        <option value="" disabled={!allowClear && Boolean(value)}>
          —
        </option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
          <option key={h} value={h}>
            {pad(Number(h))}
          </option>
        ))}
      </select>
      {minuteStep < 60 ? (
        <>
          <span className="venue-time-colon" aria-hidden="true">
            :
          </span>
          <select
            className="venue-time-select"
            aria-label={`${ariaLabel} minutes`}
            value={parts.minute}
            disabled={disabled}
            onChange={(e) => set({ minute: e.target.value, hour: parts.hour || "12" })}
          >
            <option value="" disabled>
              —
            </option>
            {minutes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <select
        className="venue-time-select"
        aria-label={`${ariaLabel} AM or PM`}
        value={parts.period}
        disabled={disabled}
        onChange={(e) => set({ period: e.target.value, hour: parts.hour || "12" })}
      >
        <option value="" disabled>
          —
        </option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One field, any mode (the API the pages already use)
// ---------------------------------------------------------------------------

export default function VenueDateTimeField({
  mode = "datetime",
  label,
  ariaLabel,
  value,
  onChange,
  placeholder,
  allowClear = true,
  defaultTime = "20:00",
  tone = "light",
  required = false,
  disabled = false,
  minuteStep = 15,
  min,
}: Props) {
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const name = label ?? ariaLabel ?? (mode === "time" ? "Time" : "Date");
  const { date, time } = splitValue(value, mode);

  const datePart = (
    <VenueDatePicker
      value={date}
      placeholder={placeholder}
      ariaLabel={name}
      labelledBy={labelId}
      required={required}
      disabled={disabled}
      min={min}
      onChange={(d) => onChange(mode === "date" ? d : `${d}T${time || defaultTime}`)}
    />
  );
  const timePart = (
    <VenueTimePicker
      value={time}
      ariaLabel={mode === "time" ? name : `${name} time`}
      allowClear={allowClear}
      required={required && mode === "time"}
      disabled={disabled}
      minuteStep={minuteStep}
      onChange={(t) => {
        if (mode === "time") onChange(t);
        // Clearing the time clears the whole date and time.
        else onChange(t ? `${date || dateKey(new Date())}T${t}` : "");
      }}
    />
  );

  return (
    <div className={`venue-picker venue-picker--${mode} venue-picker--${tone}${label ? " ticketing-portal-field" : ""}`}>
      {label ? <span id={labelId}>{label}</span> : null}
      {mode === "date" ? datePart : mode === "time" ? timePart : (
        <div className="venue-picker-row">
          {datePart}
          {timePart}
        </div>
      )}
    </div>
  );
}
