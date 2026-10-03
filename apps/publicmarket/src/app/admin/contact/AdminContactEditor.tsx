"use client";

import { useState } from "react";
import ContactPageView from "@/app/components/ContactPageView";
import type { ContactContent, ContactContentField } from "@/lib/siteContentSchema";
import { CONTACT_FIELD_LABELS } from "@/lib/siteContentSchema";

type AdminContactEditorProps = {
  initialContent: ContactContent;
};

export default function AdminContactEditor({ initialContent }: AdminContactEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeField, setActiveField] = useState<ContactContentField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [status, setStatus] = useState("");
  const isInstagram = activeField === "instagram";
  const activeLabel = activeField ? (isInstagram ? "Instagram" : CONTACT_FIELD_LABELS[activeField]) : "";

  const openEditor = (field: ContactContentField) => {
    setActiveField(field);
    setDraftValue(content[field] ?? "");
    if (field === "instagram") {
      setDraftLabel(content.instagramLabel ?? "");
    }
    setStatus("");
  };

  const closeModal = () => {
    setActiveField(null);
    setDraftValue("");
    setDraftLabel("");
    setStatus("");
  };

  const patchField = async (field: ContactContentField, value: string) => {
    const response = await fetch("/admin/api/contact", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { content: { contact: ContactContent } };
    return data.content.contact;
  };

  const saveDraft = async () => {
    if (!activeField) return;
    setStatus("Saving draft...");

    let nextContact = await patchField(activeField, draftValue);
    if (!nextContact) {
      setStatus("Draft save failed.");
      return;
    }

    if (isInstagram) {
      nextContact = await patchField("instagramLabel", draftLabel);
      if (!nextContact) {
        setStatus("Draft save failed.");
        return;
      }
    }

    setContent(nextContact);
    setStatus("Draft saved.");
    window.setTimeout(closeModal, 450);
  };

  return (
    <>
      <ContactPageView basePath="/admin" content={content} isAdmin onEdit={openEditor} />

      {activeField ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Contact Page</p>
            <h2>{activeLabel}</h2>
            {isInstagram ? (
              <>
                <label className="admin-upload-label">
                  <span>Name</span>
                  <input
                    value={draftLabel}
                    placeholder="@barphoebe"
                    onChange={(event) => setDraftLabel(event.target.value)}
                  />
                </label>
                <label className="admin-upload-label">
                  <span>Link</span>
                  <input
                    value={draftValue}
                    placeholder="https://instagram.com/barphoebe"
                    onChange={(event) => setDraftValue(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="admin-upload-label">
                <span>{activeLabel}</span>
                <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
              </label>
            )}
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
