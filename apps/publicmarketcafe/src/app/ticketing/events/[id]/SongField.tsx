"use client";
import { venuePath } from "@/lib/venue";
import { useEffect, useState } from "react";
type Preview = {
    title: string;
    artist: string;
    previewUrl: string;
    source: "spotify" | "apple";
};
type Props = {
    value: string;
    onChange: (value: string) => void;
};
// Spotify link in, confirmation out: shows the matched song and its
// 30-second clip (the one that plays in iMessage link previews).
export default function SongField({ value, onChange }: Props) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState("");
    const [checking, setChecking] = useState(false);
    useEffect(() => {
        const link = value.trim();
        setPreview(null);
        setError("");
        if (!link)
            return;
        const handle = window.setTimeout(async () => {
            setChecking(true);
            try {
                const response = await fetch(venuePath(`/ticketing/api/song-preview?url=${encodeURIComponent(link)}`));
                const data = (await response.json().catch(() => ({}))) as {
                    preview?: Preview;
                    error?: string;
                };
                if (response.ok && data.preview)
                    setPreview(data.preview);
                else
                    setError(data.error ?? "Couldn't check that link.");
            }
            catch {
                setError("Couldn't check that link.");
            }
            finally {
                setChecking(false);
            }
        }, 500);
        return () => window.clearTimeout(handle);
    }, [value]);
    return (<div className="ticketing-portal-field ticketing-portal-song">
      <label htmlFor="event-song-url">Song for link previews (optional)</label>
      <input id="event-song-url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://open.spotify.com/track/…" inputMode="url"/>
      {checking ? <p className="ticketing-portal-song-note">Checking…</p> : null}
      {preview ? (<div className="ticketing-portal-song-match">
          <p>
            ♪ <strong>{preview.title}</strong>
            {preview.artist ? ` — ${preview.artist}` : ""}
          </p>
          <audio controls preload="none" src={venuePath(preview.previewUrl)}/>
          <p className="ticketing-portal-song-note">
            30-second clip{preview.source === "apple" ? " (via Apple Music)" : ""} · plays when the event link is shared
            in iMessage.
          </p>
        </div>) : null}
      {error && !checking ? <p className="ticketing-portal-flyer-error">{error}</p> : null}
    </div>);
}
