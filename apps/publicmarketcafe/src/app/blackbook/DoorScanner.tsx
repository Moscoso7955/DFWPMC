"use client";
import { venuePath } from "@/lib/venue";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractTicketToken } from "@/lib/ticketTokenExtract";
type EventSummary = {
    id: string;
    slug: string;
    title: string;
    startsAt: string;
    doorsAt: string | null;
    ageRestriction: "21+" | "18+" | "all_ages";
    soldTickets: number;
    checkedIn: number;
    capacity: number | null;
};
type TicketMatch = {
    token: string;
    status: "valid" | "checked_in" | "void";
    holderName: string | null;
    tierName: string;
    buyerName: string;
    buyerEmail: string;
    eventTitle: string;
    eventId: string;
};
type CheckInResult = {
    status: "ok";
    holderName: string | null;
    tierName: string;
    ageRestriction: string;
    eventTitle: string;
} | {
    status: "already";
    checkedInAt: string;
    holderName: string | null;
    tierName: string;
    ageRestriction: string;
} | {
    status: "void";
} | {
    status: "wrong_event";
    eventTitle: string;
} | {
    status: "not_found";
};
type Props = {
    initialEvents: EventSummary[];
};
const AGE_LABEL: Record<string, string> = {
    "21+": "21+",
    "18+": "18+",
    all_ages: "All ages",
};
function formatShortDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
function formatTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
export default function DoorScanner({ initialEvents }: Props) {
    const [events, setEvents] = useState(initialEvents);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEvents[0]?.id ?? null);
    const [result, setResult] = useState<CheckInResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<TicketMatch[]>([]);
    const [searching, setSearching] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{
        stop: () => void;
    } | null>(null);
    const scanLockRef = useRef(false);
    const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId) ?? null, [events, selectedEventId]);
    const refreshEvents = useCallback(async () => {
        try {
            const response = await fetch(venuePath("/blackbook/api/door/events"));
            if (!response.ok)
                return;
            const data = (await response.json()) as {
                events: EventSummary[];
            };
            setEvents(data.events);
            if (data.events.length > 0 && !data.events.find((e) => e.id === selectedEventId)) {
                setSelectedEventId(data.events[0].id);
            }
        }
        catch {
            // Silent — the last-known events list is still on screen.
        }
    }, [selectedEventId]);
    useEffect(() => {
        const timer = window.setInterval(refreshEvents, 15000);
        return () => window.clearInterval(timer);
    }, [refreshEvents]);
    const submitToken = useCallback(async (token: string) => {
        if (!selectedEventId)
            return;
        try {
            const response = await fetch(venuePath("/blackbook/api/door/scan"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, expectedEventId: selectedEventId }),
            });
            if (!response.ok) {
                const error = await response.json() as {
                    error?: string;
                };
                setScanError(error.error ?? "Ticket scanning is not connected yet.");
                return;
            }
            const data = (await response.json()) as {
                result: CheckInResult;
            };
            setResult(data.result);
            window.setTimeout(refreshEvents, 200);
        }
        catch {
            setResult({ status: "not_found" });
        }
        finally {
            window.setTimeout(() => {
                scanLockRef.current = false;
            }, 900);
        }
    }, [refreshEvents, selectedEventId]);
    const startScanning = useCallback(async () => {
        setScanError(null);
        if (!videoRef.current)
            return;
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
            setScanError("Camera not supported on this device.");
            return;
        }
        try {
            const reader = new BrowserMultiFormatReader();
            readerRef.current = reader;
            const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (decoded) => {
                if (!decoded)
                    return;
                if (scanLockRef.current)
                    return;
                scanLockRef.current = true;
                const token = extractTicketToken(decoded.getText());
                if (token)
                    submitToken(token);
                else {
                    setResult({ status: "not_found" });
                    window.setTimeout(() => {
                        scanLockRef.current = false;
                    }, 1200);
                }
            });
            controlsRef.current = controls;
            setScanning(true);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Camera access denied.";
            setScanError(message);
        }
    }, [submitToken]);
    const stopScanning = useCallback(() => {
        try {
            controlsRef.current?.stop();
        }
        catch {
            // ignore
        }
        controlsRef.current = null;
        readerRef.current = null;
        setScanning(false);
    }, []);
    useEffect(() => {
        return () => stopScanning();
    }, [stopScanning]);
    const runSearch = useCallback(async () => {
        if (!selectedEventId || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const url = `/blackbook/api/door/search?event=${encodeURIComponent(selectedEventId)}&q=${encodeURIComponent(searchQuery.trim())}`;
            const response = await fetch(venuePath(url));
            if (!response.ok) {
                setSearchResults([]);
                return;
            }
            const data = (await response.json()) as {
                matches: TicketMatch[];
            };
            setSearchResults(data.matches);
        }
        finally {
            setSearching(false);
        }
    }, [searchQuery, selectedEventId]);
    useEffect(() => {
        const handle = window.setTimeout(runSearch, 250);
        return () => window.clearTimeout(handle);
    }, [runSearch]);
    const remaining = selectedEvent
        ? Math.max(0, selectedEvent.soldTickets - selectedEvent.checkedIn)
        : 0;
    return (<section className="door-scanner">
      <header className="door-header">
        <div>
          <p className="door-kicker">Door</p>
          <h1>Scan tickets</h1>
        </div>
      </header>

      {events.length === 0 ? (<div className="door-empty">
          <p>No events on the schedule today.</p>
        </div>) : (<>
          <div className="door-event-picker">
            {events.map((event) => (<button key={event.id} type="button" className={event.id === selectedEventId
                    ? "door-event-chip door-event-chip--active"
                    : "door-event-chip"} onClick={() => {
                    setSelectedEventId(event.id);
                    setResult(null);
                    setSearchQuery("");
                }}>
                <span className="door-event-chip-title">{event.title}</span>
                <span className="door-event-chip-time">{formatShortDate(event.startsAt)}</span>
              </button>))}
          </div>

          <div className={`door-camera${scanning ? " door-camera--active" : ""}`}>
            <video ref={videoRef} playsInline muted/>
            {!scanning ? (<button type="button" className="door-camera-start" onClick={startScanning}>
                Start scanning
              </button>) : (<button type="button" className="door-camera-stop" onClick={stopScanning}>
                Stop
              </button>)}
            {scanError ? <p className="door-camera-error">{scanError}</p> : null}
            {result ? (<div className={`door-result-bar door-result-bar--${result.status}`} role="status" aria-live="assertive">
                <div className="door-result-bar-text">
                  {result.status === "ok" ? (<>
                      <strong>Admit</strong>
                      <span>
                        {result.holderName ?? "Ticket holder"} · {result.tierName}
                      </span>
                    </>) : result.status === "already" ? (<>
                      <strong>Already in</strong>
                      <span>
                        {result.holderName ?? "Ticket holder"} · at{" "}
                        {new Date(result.checkedInAt).toLocaleTimeString("en-US", {
                        timeZone: "America/Chicago",
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                      </span>
                    </>) : result.status === "void" ? (<>
                      <strong>Void</strong>
                      <span>Refunded — do not admit</span>
                    </>) : result.status === "wrong_event" ? (<>
                      <strong>Wrong event</strong>
                      <span>{result.eventTitle}</span>
                    </>) : (<>
                      <strong>Not found</strong>
                      <span>Try manual search</span>
                    </>)}
                </div>
                {result.status === "ok" || result.status === "already" ? (<span className="door-result-bar-age">
                    {AGE_LABEL[result.ageRestriction] ?? result.ageRestriction}
                  </span>) : null}
                <button type="button" className="door-result-bar-dismiss" aria-label="Dismiss" onClick={() => setResult(null)}>
                  ×
                </button>
              </div>) : null}
          </div>


          <details className="door-search">
            <summary>Manual search</summary>
            <div className="door-search-body">
              <input type="search" placeholder="Name or email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off"/>
              {searching ? <p className="door-search-status">Searching...</p> : null}
              {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 ? (<p className="door-search-status">No matches.</p>) : null}
              <ul className="door-search-list">
                {searchResults.map((match) => (<li key={match.token}>
                    <button type="button" className={`door-search-row door-search-row--${match.status}`} onClick={() => submitToken(match.token)}>
                      <div>
                        <p>{match.buyerName}</p>
                        <p className="door-search-row-sub">
                          {match.buyerEmail} · {match.tierName}
                        </p>
                      </div>
                      <span className="door-search-row-status">
                        {match.status === "valid"
                    ? "Check in"
                    : match.status === "checked_in"
                        ? "In"
                        : "Void"}
                      </span>
                    </button>
                  </li>))}
              </ul>
            </div>
          </details>

          {selectedEvent ? (<>
              <dl className="door-counter" aria-label="Live counter">
                <div>
                  <dt>Checked in</dt>
                  <dd>{selectedEvent.checkedIn}</dd>
                </div>
                <div>
                  <dt>Sold</dt>
                  <dd>{selectedEvent.soldTickets}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{remaining}</dd>
                </div>
                {selectedEvent.capacity !== null ? (<div>
                    <dt>Capacity</dt>
                    <dd>{selectedEvent.capacity}</dd>
                  </div>) : null}
              </dl>

              <div className="door-age-badge" aria-live="polite">
                <span>{AGE_LABEL[selectedEvent.ageRestriction] ?? selectedEvent.ageRestriction}</span>
                {selectedEvent.doorsAt ? <span>Doors {formatTime(selectedEvent.doorsAt)}</span> : null}
              </div>
            </>) : null}
        </>)}
    </section>);
}
