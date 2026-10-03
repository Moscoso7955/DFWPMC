"use client";

import { useState } from "react";
import CareersPageView from "@/app/components/CareersPageView";
import type { CareersContent, CareersContentField } from "@/lib/siteContentSchema";
import { CAREERS_FIELD_LABELS } from "@/lib/siteContentSchema";

type AdminCareersEditorProps = {
  initialContent: CareersContent;
};

export default function AdminCareersEditor({ initialContent }: AdminCareersEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeField, setActiveField] = useState<CareersContentField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [status, setStatus] = useState("");
  const activeLabel = activeField ? CAREERS_FIELD_LABELS[activeField] : "";

  const openEditor = (field: CareersContentField) => {
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
    if (!activeField) return;
    setStatus("Saving draft...");

    const saveResponse = await fetch("/admin/api/careers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: activeField, value: draftValue }),
    });

    if (!saveResponse.ok) {
      setStatus("Draft save failed.");
      return;
    }

    const saveData = (await saveResponse.json()) as { content: { careers: CareersContent } };
    setContent(saveData.content.careers);
    setStatus("Draft saved.");
    window.setTimeout(closeModal, 450);
  };

  return (
    <>
      <CareersPageView basePath="/admin" content={content} isAdmin onEdit={openEditor} />

      {activeField ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Careers Page</p>
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
