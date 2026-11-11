"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The venue date/time picker, styled after the /calendar grid. One
// component, three modes, each using the same string the matching browser
// input produced, so callers keep their existing conversion helpers:
//   datetime  "YYYY-MM-DDTHH:mm"  (calendar + 15-minute time column)
//   date      "YYYY-MM-DD"        (calendar only)
//   time      "HH:mm"             (15-minute times only)
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
  allowClear?: boolean;
  /** Footer button that empties the value (default "Clear"). */
  clearLabel?: string;
  defaultTime?: string;
  tone?: "dark" | "light";
  required?: boolean;
  disabled?: boolean;
  /** Time mode: where the list of times starts, in minutes after midnight (720 = noon, for nights). */
  dayStart?: number;
  /** Time mode: extra choices above the times, e.g. { value: "close", label: "Close" }. */
  extras?: { value: string; label: string }[];
  /** Date modes: days to flag with a star, e.g. { "2026-12-25": "Christmas" }. */
  marks?: Record<string, string>;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_COUNT = 96;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(value: string, mode: Mode): { date: string | null; minutes: number | null } | null {
  if (mode === "time") {
    const t = /^(\d{2}):(\d{2})/.exec(value);
    return t ? { date: null, minutes: Number(t[1]) * 60 + Number(t[2]) } : null;
  }
  if (mode === "date") {
    const d = /^(\d{4}-\d{2}-\d{2})$/.exec(value);
    return d ? { date: d[1], minutes: null } : null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? { date: match[1], minutes: Number(match[2]) * 60 + Number(match[3]) } : null;
}

function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  const days = Math.ceil((mondayOffset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: days }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function slotLabel(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 >= 12 ? "PM" : "AM"}`;
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDisplay(value: string, mode: Mode, extras: Props["extras"]): string {
  const extra = extras?.find((x) => x.value === value);
  if (extra) return extra.label;
  const parsed = parse(value, mode);
  if (!parsed) return "";
  if (mode === "time") return slotLabel(parsed.minutes!);
  if (mode === "date") return dayLabel(parsed.date!);
  return `${dayLabel(parsed.date!)} · ${slotLabel(parsed.minutes!)}`;
}

export default function VenueDateTimeField({
  mode = "datetime",
  label,
  ariaLabel,
  value,
  onChange,
  placeholder,
  allowClear = true,
  clearLabel = "Clear",
  defaultTime = "20:00",
  tone = "dark",
  required = false,
  disabled = false,
  dayStart = 0,
  extras,
  marks,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [open, setOpen] = useState(false);
  const parsed = parse(value, mode);
  const hasDate = mode !== "time";
  const hasTime = mode !== "date";
  const [month, setMonth] = useState(() => {
    const base = parsed?.date ? new Date(`${parsed.date}T00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The panel is portaled to <body> with fixed positioning so scrolling
  // modals can't clip it. Place it under the trigger, flip above when
  // there's no room, and keep it on screen. Phones use the CSS bottom
  // sheet instead.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel || window.innerWidth <= 560) {
        setPosition(null);
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const margin = 12;
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - margin) {
        const above = rect.top - 8 - height;
        top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - height);
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

  // Bring the selected (or default) time into view without scrolling the page.
  useEffect(() => {
    if (!open) return;
    const list = timesRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-pressed='true'], [data-default='true']");
    if (list && active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [open]);

  const openPicker = () => {
    if (disabled) return;
    if (parsed?.date) {
      const [y, m] = parsed.date.split("-").map(Number);
      setMonth(new Date(y, m - 1, 1));
    }
    setOpen((current) => !current);
  };

  const [defaultHour, defaultMinute] = defaultTime.split(":").map(Number);
  const selectedMinutes = parsed?.minutes ?? defaultHour * 60 + defaultMinute;
  const todayKey = dateKey(new Date());
  const toTime = (minutesOfDay: number) => `${pad(Math.floor(minutesOfDay / 60))}:${pad(minutesOfDay % 60)}`;

  const selectDay = (day: Date) => {
    if (mode === "date") {
      onChange(dateKey(day));
      setOpen(false);
    } else onChange(`${dateKey(day)}T${toTime(selectedMinutes)}`);
  };
  const selectTime = (minutesOfDay: number) => {
    if (mode === "time") {
      onChange(toTime(minutesOfDay));
      setOpen(false);
    } else onChange(`${parsed?.date ?? dateKey(new Date())}T${toTime(minutesOfDay)}`);
  };

  // 15-minute slots from dayStart around the clock. Keep an off-grid saved
  // time (e.g. 8:10) selectable instead of dropping it.
  const grid = Array.from({ length: SLOT_COUNT }, (_, i) => (dayStart + i * 15) % 1440);
  const slots =
    parsed?.minutes == null || grid.includes(parsed.minutes)
      ? grid
      : [...grid, parsed.minutes].sort((a, b) => ((a - dayStart + 1440) % 1440) - ((b - dayStart + 1440) % 1440));
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shown = formatDisplay(value, mode, extras);
  const emptyText = placeholder ?? (mode === "time" ? "Pick a time" : "Pick a date");
  const name = label ?? ariaLabel ?? (mode === "time" ? "Time" : "Date");

  return (
    <div
      className={`venue-picker venue-picker--${mode}${tone === "light" ? " venue-picker--light" : " ticketing-portal-field"}`}
      ref={rootRef}
    >
      {label ? <span id={`${id}-label`}>{label}</span> : null}
      <button
        ref={triggerRef}
        type="button"
        className={`venue-picker-trigger${shown ? "" : " venue-picker-trigger--empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? undefined : `${name}: ${shown || emptyText}`}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        disabled={disabled}
        onClick={openPicker}
      >
        <span id={`${id}-value`}>{shown || emptyText}</span>
        <span className="venue-picker-icon" aria-hidden="true">
          ▾
        </span>
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
              className={`venue-picker-panel venue-picker-panel--${mode}`}
              role="dialog"
              aria-label={mode === "time" ? `${name} time` : mode === "date" ? `${name} date` : `${name} date and time`}
              style={position ? { top: position.top, left: position.left } : undefined}
            >
              <div className="venue-picker-body">
                {hasDate ? (
                  <div className="venue-picker-calendar">
                    <div className="venue-picker-month">
                      <button
                        type="button"
                        className="venue-picker-nav venue-picker-nav--back"
                        onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      >
                        <span aria-hidden="true">←</span> Back
                      </button>
                      <span>{monthLabel}</span>
                      <button
                        type="button"
                        className="venue-picker-nav venue-picker-nav--next"
                        onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      >
                        Next <span aria-hidden="true">→</span>
                      </button>
                    </div>

                    <div className="venue-picker-grid">
                      {WEEKDAYS.map((day) => (
                        <div className="venue-picker-weekday" key={day}>
                          {day}
                        </div>
                      ))}
                      {monthGrid(month).map((day) => {
                        const key = dateKey(day);
                        const mark = marks?.[key];
                        const classes = ["venue-picker-day"];
                        if (day.getMonth() !== month.getMonth()) classes.push("venue-picker-day--outside");
                        if (key === todayKey) classes.push("venue-picker-day--today");
                        if (parsed?.date === key) classes.push("venue-picker-day--selected");
                        if (mark) classes.push("venue-picker-day--marked");
                        const spoken = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
                        return (
                          <button
                            type="button"
                            key={key}
                            className={classes.join(" ")}
                            aria-pressed={parsed?.date === key}
                            aria-label={mark ? `${spoken}, ${mark}` : spoken}
                            title={mark}
                            onClick={() => selectDay(day)}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {hasTime ? (
                  <div className="venue-picker-times" ref={timesRef} role="group" aria-label="Time">
                    {extras?.map((x) => (
                      <button
                        type="button"
                        key={x.value}
                        className="venue-picker-slot venue-picker-slot--extra"
                        aria-pressed={value === x.value}
                        onClick={() => {
                          onChange(x.value);
                          setOpen(false);
                        }}
                      >
                        {x.label}
                      </button>
                    ))}
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        className="venue-picker-slot"
                        aria-pressed={parsed?.minutes === slot}
                        data-default={!parsed && slot === selectedMinutes ? "true" : undefined}
                        onClick={() => selectTime(slot)}
                      >
                        {slotLabel(slot)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="venue-picker-footer">
                {allowClear && value ? (
                  <button
                    type="button"
                    className="venue-picker-clear"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    {clearLabel}
                  </button>
                ) : (
                  <span />
                )}
                {marks && hasDate && Object.keys(marks).length ? (
                  <span className="venue-picker-legend">
                    <span aria-hidden="true">★</span> {Object.values(marks).join(", ")}
                  </span>
                ) : null}
                <button type="button" className="venue-picker-done" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
