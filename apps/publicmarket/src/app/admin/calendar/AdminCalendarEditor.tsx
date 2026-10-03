"use client";

import { useState } from "react";
import CalendarPageView from "@/app/components/CalendarPageView";
import type { CalendarContent, CalendarContentField, CalendarEventContent } from "@/lib/siteContentSchema";
import { CALENDAR_FIELD_LABELS } from "@/lib/siteContentSchema";

type AdminCalendarEditorProps = {
  initialContent: CalendarContent;
};

type EventDraft = {
  title: string;
  time: string;
  description: string;
  url: string;
};

type MoveDraft = {
  date: string;
  time: string;
};

const EMPTY_EVENT_DRAFT: EventDraft = {
  title: "",
  time: "",
  description: "",
  url: "",
};

const EMPTY_MOVE_DRAFT: MoveDraft = {
  date: "",
  time: "",
};

function formatAdminDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminCalendarEditor({ initialContent }: AdminCalendarEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeField, setActiveField] = useState<CalendarContentField | null>(null);
  const [titleDraft, setTitleDraft] = useState(initialContent.title);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState<EventDraft>(EMPTY_EVENT_DRAFT);
  const [movingEventId, setMovingEventId] = useState<string | null>(null);
  const [moveDraft, setMoveDraft] = useState<MoveDraft>(EMPTY_MOVE_DRAFT);
  const [deleteCandidate, setDeleteCandidate] = useState<CalendarEventContent | null>(null);
  const [status, setStatus] = useState("");
  const activeLabel = activeField ? CALENDAR_FIELD_LABELS[activeField] : "";
  const selectedDateEvents = selectedDate
    ? content.events.filter((event) => event.date === selectedDate)
    : [];

  const closeModal = () => {
    setActiveField(null);
    setSelectedDate(null);
    setIsEventFormOpen(false);
    setTitleDraft(content.title);
    setEventDraft(EMPTY_EVENT_DRAFT);
    setMovingEventId(null);
    setMoveDraft(EMPTY_MOVE_DRAFT);
    setDeleteCandidate(null);
    setStatus("");
  };

  const openDayEditor = (date: string) => {
    setSelectedDate(date);
    setIsEventFormOpen(false);
    setEventDraft(EMPTY_EVENT_DRAFT);
    setMovingEventId(null);
    setMoveDraft(EMPTY_MOVE_DRAFT);
    setDeleteCandidate(null);
    setStatus("");
  };

  const saveTitleDraft = async () => {
    setStatus("Saving draft...");

    const saveResponse = await fetch("/admin/api/calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "title", value: titleDraft }),
    });

    if (!saveResponse.ok) {
      setStatus("Draft save failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { calendar: CalendarContent } };
    setContent(saveData.content.calendar);
    setStatus("Draft saved.");
    window.setTimeout(closeModal, 450);
  };

  const saveEventDraft = async () => {
    setStatus("Saving event...");

    const saveResponse = await fetch("/admin/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eventDraft, date: selectedDate }),
    });

    if (!saveResponse.ok) {
      setStatus("Event save failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { calendar: CalendarContent } };
    setContent(saveData.content.calendar);
    setStatus("Event saved.");
    setEventDraft(EMPTY_EVENT_DRAFT);
    setIsEventFormOpen(false);
    window.setTimeout(() => setStatus(""), 450);
  };

  const deleteEventDraft = async (event: CalendarEventContent) => {
    setStatus("Deleting event...");

    const saveResponse = await fetch("/admin/api/calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id }),
    });

    if (!saveResponse.ok) {
      setStatus("Delete failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { calendar: CalendarContent } };
    setContent(saveData.content.calendar);
    setStatus("Event deleted.");
    setDeleteCandidate(null);
    window.setTimeout(() => setStatus(""), 450);
  };

  const openMoveEvent = (event: CalendarEventContent) => {
    setIsEventFormOpen(false);
    setMovingEventId(event.id);
    setMoveDraft({ date: event.date, time: event.time });
    setStatus("");
  };

  const saveMoveDraft = async () => {
    if (!movingEventId) return;
    setStatus("Moving event...");

    const saveResponse = await fetch("/admin/api/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: movingEventId, ...moveDraft }),
    });

    if (!saveResponse.ok) {
      setStatus("Move failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { calendar: CalendarContent } };
    setContent(saveData.content.calendar);
    setStatus("Event moved.");
    setMovingEventId(null);
    setMoveDraft(EMPTY_MOVE_DRAFT);
    window.setTimeout(() => setStatus(""), 450);
  };

  const updateEventDraft = (field: keyof EventDraft, value: string) => {
    setEventDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  };

  const updateMoveDraft = (field: keyof MoveDraft, value: string) => {
    setMoveDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  };

  return (
    <>
      <CalendarPageView basePath="/admin" content={content} isAdmin onEdit={setActiveField} onDayEdit={openDayEditor} />

      {activeField ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Calendar Page</p>
            <h2>{activeLabel}</h2>
            <label className="admin-upload-label">
              <span>{activeLabel}</span>
              <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
            </label>
            {status ? <p className="admin-modal-status">{status}</p> : null}
            <div className="admin-modal-actions">
              <button type="button" onClick={saveTitleDraft}>
                Save Draft
              </button>
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDate ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${formatAdminDate(selectedDate)}`}>
          <div className="admin-modal-panel admin-modal-panel--wide">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Calendar Page</p>
            <h2>{formatAdminDate(selectedDate)}</h2>
            {selectedDateEvents.length ? (
              <div className="admin-day-events">
                {selectedDateEvents.map((event) => (
                  <article className="admin-day-event" key={event.id}>
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.time}</p>
                      <p>{event.description}</p>
                      {event.url ? <a href={event.url}>{event.url}</a> : null}
                    </div>
                    <div className="admin-day-event-actions">
                      <button type="button" onClick={() => openMoveEvent(event)}>
                        Move Event
                      </button>
                      <button type="button" onClick={() => setDeleteCandidate(event)}>
                        Delete
                      </button>
                    </div>
                    {movingEventId === event.id ? (
                      <div className="admin-move-event-form">
                        <label className="admin-upload-label">
                          <span>New date</span>
                          <input
                            type="date"
                            value={moveDraft.date}
                            onChange={(changeEvent) => updateMoveDraft("date", changeEvent.target.value)}
                          />
                        </label>
                        <label className="admin-upload-label">
                          <span>New time</span>
                          <input value={moveDraft.time} onChange={(changeEvent) => updateMoveDraft("time", changeEvent.target.value)} />
                        </label>
                        <div className="admin-modal-actions admin-modal-actions--inline">
                          <button type="button" onClick={saveMoveDraft}>
                            Save Move
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMovingEventId(null);
                              setMoveDraft(EMPTY_MOVE_DRAFT);
                            }}
                          >
                            Cancel Move
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-modal-empty">No events.</p>
            )}

            {isEventFormOpen ? (
              <div className="admin-event-form">
                <label className="admin-upload-label">
                  <span>Event title</span>
                  <input value={eventDraft.title} onChange={(event) => updateEventDraft("title", event.target.value)} />
                </label>
                <label className="admin-upload-label">
                  <span>Time</span>
                  <input value={eventDraft.time} onChange={(event) => updateEventDraft("time", event.target.value)} />
                </label>
                <label className="admin-upload-label">
                  <span>Description</span>
                  <textarea
                    className="admin-textarea admin-textarea--compact"
                    value={eventDraft.description}
                    onChange={(event) => updateEventDraft("description", event.target.value)}
                  />
                </label>
                <label className="admin-upload-label">
                  <span>More info URL</span>
                  <input value={eventDraft.url} onChange={(event) => updateEventDraft("url", event.target.value)} />
                </label>
              </div>
            ) : null}
            {status ? <p className="admin-modal-status">{status}</p> : null}
            <div className="admin-modal-actions">
              {isEventFormOpen ? (
                <button type="button" onClick={saveEventDraft}>
                  Save Event
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMovingEventId(null);
                    setMoveDraft(EMPTY_MOVE_DRAFT);
                    setIsEventFormOpen(true);
                  }}
                >
                  Add Event
                </button>
              )}
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="admin-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirm delete event">
          <div className="admin-confirm-panel">
            <p className="admin-modal-kicker">Calendar Page</p>
            <h2>Delete Event</h2>
            <p>Are you sure you want to delete this event?</p>
            <p className="admin-confirm-event-name">{deleteCandidate.title}</p>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => deleteEventDraft(deleteCandidate)}>
                Yes, Delete
              </button>
              <button type="button" onClick={() => setDeleteCandidate(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
