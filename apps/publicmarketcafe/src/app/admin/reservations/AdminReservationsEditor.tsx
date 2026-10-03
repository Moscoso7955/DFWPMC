"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
import ReservationsPageView from "@/app/components/ReservationsPageView";
import type { ReservationsContent, ReservationsContentField } from "@/lib/siteContentSchema";
import { RESERVATIONS_FIELD_LABELS } from "@/lib/siteContentSchema";
type AdminReservationsEditorProps = {
    initialContent: ReservationsContent;
};
export default function AdminReservationsEditor({ initialContent }: AdminReservationsEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [activeField, setActiveField] = useState<ReservationsContentField | null>(null);
    const [draftValue, setDraftValue] = useState("");
    const [status, setStatus] = useState("");
    const activeLabel = activeField ? RESERVATIONS_FIELD_LABELS[activeField] : "";
    const openEditor = (field: ReservationsContentField) => {
        setActiveField(field);
        setDraftValue(content[field] ?? "");
        setStatus("");
    };
    const closeModal = () => {
        setActiveField(null);
        setDraftValue("");
        setStatus("");
    };
    const saveDraft = async () => {
        if (!activeField)
            return;
        setStatus("Saving draft...");
        const saveResponse = await fetch(venuePath("/admin/api/reservations"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field: activeField, value: draftValue }),
        });
        if (!saveResponse.ok) {
            setStatus("Draft save failed.");
            return;
        }
        const saveData = (await saveResponse.json()) as {
            content: {
                reservations: ReservationsContent;
            };
        };
        setContent(saveData.content.reservations);
        setStatus("Draft saved.");
        window.setTimeout(closeModal, 450);
    };
    return (<>
      <ReservationsPageView basePath="/admin" content={content} isAdmin onEdit={openEditor}/>

      {activeField ? (<div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Reservations Page</p>
            <h2>{activeLabel}</h2>
            <label className="admin-upload-label">
              <span>{activeLabel}</span>
              {activeField === "embedCode" ? (<textarea className="admin-embed-textarea" value={draftValue} onChange={(event) => setDraftValue(event.target.value)} placeholder="Paste the embed code (e.g. an <iframe>) here" rows={10}/>) : (<input value={draftValue} onChange={(event) => setDraftValue(event.target.value)}/>)}
            </label>
            {status ? <p className="admin-modal-status">{status}</p> : null}
            <div className="admin-modal-actions">
              <button type="button" onClick={saveDraft}>
                Save Draft
              </button>
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>) : null}
    </>);
}
