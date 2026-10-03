"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import { WEEKDAY_KEYS, WEEKDAY_LABELS, type OperatingHoursContent } from "@/lib/siteContentSchema";
import AdminBackLink from "../AdminBackLink";
type AdminOperatingHoursEditorProps = {
    initialHours: OperatingHoursContent;
};
export default function AdminOperatingHoursEditor({ initialHours }: AdminOperatingHoursEditorProps) {
    const [hours, setHours] = useState<OperatingHoursContent>(initialHours);
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const updateDay = (key: (typeof WEEKDAY_KEYS)[number], patch: Partial<OperatingHoursContent[(typeof WEEKDAY_KEYS)[number]]>) => {
        setHours((current) => ({
            ...current,
            [key]: { ...current[key], ...patch },
        }));
    };
    const save = async () => {
        setSaving(true);
        setStatus("Saving draft...");
        try {
            const response = await fetch(venuePath("/admin/api/hours"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hours }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                setStatus(data.error ?? "Save failed.");
                return;
            }
            setStatus("Draft saved. Publish changes to make them live.");
        }
        catch {
            setStatus("Save failed.");
        }
        finally {
            setSaving(false);
        }
    };
    return (<section className="admin-operating-hours" aria-labelledby="operating-hours-title">
      <header className="admin-operating-hours-header">
        <AdminBackLink fallbackHref="/admin/calendar"/>
        <h1 id="operating-hours-title">Operating Hours</h1>
        <p>
          Events on the public calendar that fall outside these hours are hidden.
          Overnight hours (e.g. 4 PM to 1 AM) are supported: set closing to the early-morning time and the window
          crosses midnight automatically. Save the draft here, then hit Publish Changes in the toolbar to go live.
        </p>
      </header>

      <table className="admin-hours-table">
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Open</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
          </tr>
        </thead>
        <tbody>
          {WEEKDAY_KEYS.map((key) => {
            const day = hours[key];
            return (<tr key={key} className={day.open ? undefined : "admin-hours-row--closed"}>
                <th scope="row">{WEEKDAY_LABELS[key]}</th>
                <td>
                  <label className="admin-hours-toggle">
                    <input type="checkbox" checked={day.open} onChange={(event) => updateDay(key, { open: event.target.checked })}/>
                    <span>{day.open ? "Open" : "Closed"}</span>
                  </label>
                </td>
                <td>
                  <input type="time" value={day.openTime} onChange={(event) => updateDay(key, { openTime: event.target.value })} disabled={!day.open}/>
                </td>
                <td>
                  <input type="time" value={day.closeTime} onChange={(event) => updateDay(key, { closeTime: event.target.value })} disabled={!day.open}/>
                </td>
              </tr>);
        })}
        </tbody>
      </table>

      {status ? <p className="admin-modal-status">{status}</p> : null}

      <div className="admin-modal-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>
    </section>);
}
