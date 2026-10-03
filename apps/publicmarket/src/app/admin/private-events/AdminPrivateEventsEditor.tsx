"use client";

import { useState } from "react";
import PrivateEventsPageView from "@/app/components/PrivateEventsPageView";
import type { PrivateEventsContent, PrivateEventsContentField } from "@/lib/siteContentSchema";
import { PRIVATE_EVENTS_FIELD_LABELS } from "@/lib/siteContentSchema";

type AdminPrivateEventsEditorProps = {
  initialContent: PrivateEventsContent;
};

export default function AdminPrivateEventsEditor({ initialContent }: AdminPrivateEventsEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeField, setActiveField] = useState<PrivateEventsContentField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [status, setStatus] = useState("");
  const activeLabel = activeField ? PRIVATE_EVENTS_FIELD_LABELS[activeField] : "";

  const openEditor = (field: PrivateEventsContentField) => {
    setActiveField(field);
    setDraftValue(content[field]);
    setStatus("");
  };

  const closeModal = () => {
    setActiveField(null);
    setDraftValue("");
    setStatus("");
  };

  const saveDraft = async () => {
    if (!activeField) return;
    setStatus("Saving draft...");

    const saveResponse = await fetch("/admin/api/private-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: activeField, value: draftValue }),
    });

    if (!saveResponse.ok) {
      setStatus("Draft save failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { privateEvents: PrivateEventsContent } };
    setContent(saveData.content.privateEvents);
    setStatus("Draft saved.");
    window.setTimeout(closeModal, 450);
  };

  return (
    <>
      <PrivateEventsPageView basePath="/admin" content={content} isAdmin onEdit={openEditor} />

      {activeField ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Private Events Page</p>
            <h2>{activeLabel}</h2>
            <label className="admin-upload-label">
              <span>{activeLabel}</span>
              {activeField === "embedCode" ? (
                <textarea
                  className="admin-embed-textarea"
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  placeholder="Paste the embed code (e.g. an <iframe>) here"
                  rows={10}
                />
              ) : (
                <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
              )}
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
        </div>
      ) : null}
    </>
  );
}
