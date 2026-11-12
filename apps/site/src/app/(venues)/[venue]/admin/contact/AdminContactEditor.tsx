"use client";
import { useVenue } from "@/app/components/VenueProvider";
import { useState } from "react";
import ContactPageView from "@/app/components/ContactPageView";
import type { ContactContent, ContactContentField } from "@/lib/siteContentSchema";
import { CONTACT_FIELD_LABELS } from "@/lib/siteContentSchema";
type AdminContactEditorProps = {
    initialContent: ContactContent;
};
export default function AdminContactEditor({ initialContent }: AdminContactEditorProps) {
    const { venuePath } = useVenue();
    const [content, setContent] = useState(initialContent);
    const [activeField, setActiveField] = useState<ContactContentField | null>(null);
    const [draftValue, setDraftValue] = useState("");
    const [status, setStatus] = useState("");
    // Email, phone and Instagram are edited together in one "Contact info" form.
    const [details, setDetails] = useState({ email: "", phone: "", instagramLabel: "", instagram: "" });
    const isDetails = activeField === "email" || activeField === "phone" || activeField === "instagram" || activeField === "instagramLabel";
    const isEmbedField = activeField === "joinEmbedCode";
    const activeLabel = activeField ? (isDetails ? "Contact info" : CONTACT_FIELD_LABELS[activeField]) : "";
    const openEditor = (field: ContactContentField) => {
        setActiveField(field);
        setDraftValue(content[field] ?? "");
        setDetails({
            email: content.email ?? "",
            phone: content.phone ?? "",
            instagramLabel: content.instagramLabel ?? "",
            instagram: content.instagram ?? "",
        });
        setStatus("");
    };
    const closeModal = () => {
        setActiveField(null);
        setDraftValue("");
        setStatus("");
    };
    const patchField = async (field: ContactContentField, value: string) => {
        const response = await fetch(venuePath("/admin/api/contact"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, value }),
        });
        if (!response.ok)
            return null;
        const data = (await response.json()) as {
            content: {
                contact: ContactContent;
            };
        };
        return data.content.contact;
    };
    const saveDraft = async () => {
        if (!activeField)
            return;
        setStatus("Saving draft...");
        if (isDetails) {
            let next: ContactContent | null = content;
            for (const field of ["email", "phone", "instagramLabel", "instagram"] as const) {
                if ((content[field] ?? "") === details[field])
                    continue;
                next = await patchField(field, details[field]);
                if (!next) {
                    setStatus("Draft save failed.");
                    return;
                }
            }
            setContent(next ?? content);
            setStatus("Draft saved.");
            window.setTimeout(closeModal, 450);
            return;
        }
        const nextContact = await patchField(activeField, draftValue);
        if (!nextContact) {
            setStatus("Draft save failed.");
            return;
        }
        setContent(nextContact);
        setStatus("Draft saved.");
        window.setTimeout(closeModal, 450);
    };
    return (<>
      <ContactPageView basePath="/admin" content={content} isAdmin onEdit={openEditor}/>

      {activeField ? (<div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Contact Page</p>
            <h2>{activeLabel}</h2>
            {isDetails ? (<>
                <label className="admin-upload-label">
                  <span>Email</span>
                  <input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })}/>
                </label>
                <label className="admin-upload-label">
                  <span>Phone</span>
                  <input type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })}/>
                </label>
                <label className="admin-upload-label">
                  <span>Instagram name</span>
                  <input value={details.instagramLabel} placeholder="@venue" onChange={(e) => setDetails({ ...details, instagramLabel: e.target.value })}/>
                </label>
                <label className="admin-upload-label">
                  <span>Instagram link</span>
                  <input value={details.instagram} placeholder="https://instagram.com/venue" onChange={(e) => setDetails({ ...details, instagram: e.target.value })}/>
                </label>
              </>) : isEmbedField ? (<label className="admin-upload-label">
                <span>{activeLabel}</span>
                <textarea rows={6} spellCheck={false} value={draftValue} onChange={(event) => setDraftValue(event.target.value)}/>
              </label>) : (<label className="admin-upload-label">
                <span>{activeLabel}</span>
                <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)}/>
              </label>)}
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
