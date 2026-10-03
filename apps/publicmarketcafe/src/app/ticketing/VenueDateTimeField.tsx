"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Same "YYYY-MM-DDTHH:mm" string a datetime-local input produces, so
// callers keep their existing conversion helpers.
type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  defaultTime?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Every 15 minutes across the day, as minutes after midnight.
const SLOTS = Array.from({ length: 96 }, (_, i) => i * 15);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(value: string): { date: string; hour: number; minute: number } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  return { date: match[1], hour: Number(match[2]), minute: Number(match[3]) };
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

function formatDisplay(value: string): string {
  const parsed = parse(value);
  if (!parsed) return "";
  const [y, m, d] = parsed.date.split("-").map(Number);
  const date = new Date(y, m - 1, d, parsed.hour, parsed.minute);
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

export default function VenueDateTimeField({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  allowClear = true,
  defaultTime = "20:00",
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const timesRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [open, setOpen] = useState(false);
  const parsed = parse(value);
  const [month, setMonth] = useState(() => {
    const base = parsed ? new Date(`${parsed.date}T00:00`) : new Date();
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
    if (parsed) {
      const [y, m] = parsed.date.split("-").map(Number);
      setMonth(new Date(y, m - 1, 1));
    }
    setOpen((current) => !current);
  };

  const [defaultHour, defaultMinute] = defaultTime.split(":").map(Number);
  const selectedMinutes = parsed ? parsed.hour * 60 + parsed.minute : defaultHour * 60 + defaultMinute;
  const todayKey = dateKey(new Date());

  const emit = (date: string, minutesOfDay: number) =>
    onChange(`${date}T${pad(Math.floor(minutesOfDay / 60))}:${pad(minutesOfDay % 60)}`);
  const selectDay = (day: Date) => emit(dateKey(day), selectedMinutes);
  const selectTime = (minutesOfDay: number) => emit(parsed?.date ?? dateKey(new Date()), minutesOfDay);

  // Keep an off-grid saved time (e.g. 8:10) selectable instead of dropping it.
  const slots = SLOTS.includes(selectedMinutes) ? SLOTS : [...SLOTS, selectedMinutes].sort((a, b) => a - b);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="ticketing-portal-field venue-picker" ref={rootRef}>
      <span id={`${id}-label`}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`venue-picker-trigger${value ? "" : " venue-picker-trigger--empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={openPicker}
      >
        <span id={`${id}-value`}>{value ? formatDisplay(value) : placeholder}</span>
        <span className="venue-picker-icon" aria-hidden="true">
          ▾
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="venue-picker-panel"
              role="dialog"
              aria-label={`${label} date and time`}
              style={position ? { top: position.top, left: position.left } : undefined}
            >
              <div className="venue-picker-body">
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
                      const classes = ["venue-picker-day"];
                      if (day.getMonth() !== month.getMonth()) classes.push("venue-picker-day--outside");
                      if (key === todayKey) classes.push("venue-picker-day--today");
                      if (parsed?.date === key) classes.push("venue-picker-day--selected");
                      return (
                        <button
                          type="button"
                          key={key}
                          className={classes.join(" ")}
                          aria-pressed={parsed?.date === key}
                          aria-label={day.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                          onClick={() => selectDay(day)}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="venue-picker-times" ref={timesRef} role="group" aria-label="Time">
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      className="venue-picker-slot"
                      aria-pressed={slot === selectedMinutes && Boolean(parsed)}
                      data-default={!parsed && slot === selectedMinutes ? "true" : undefined}
                      onClick={() => selectTime(slot)}
                    >
                      {slotLabel(slot)}
                    </button>
                  ))}
                </div>
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
                    Clear
                  </button>
                ) : (
                  <span />
                )}
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
