"use client";

import { useMemo, useState } from "react";
import type { AssetDetails } from "@/lib/assetDetailsSchema";
import type { MenuContent, MenuContentField } from "@/lib/siteContentSchema";
import MenuPageView from "@/app/components/MenuPageView";

type AdminMenuEditorProps = {
  initialContent: MenuContent;
  initialImageDetails: AssetDetails;
};

function MenuAssetDetails({ details }: { details: AssetDetails }) {
  return (
    <div className="admin-asset-details" aria-label="Current file details">
      <p>Current file details</p>
      <dl>
        <div>
          <dt>Suggested Type</dt>
          <dd>{details.suggestedType}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{details.fileSize}</dd>
        </div>
        <div>
          <dt>Width</dt>
          <dd>{details.width ? `${details.width}px` : "Unknown"}</dd>
        </div>
        <div>
          <dt>Height</dt>
          <dd>{details.height ? `${details.height}px` : "Unknown"}</dd>
        </div>
        <div>
          <dt>Ratio</dt>
          <dd>{details.ratio}</dd>
        </div>
      </dl>
      <span>Upload a replacement with a similar width, height, and ratio when possible.</span>
    </div>
  );
}

export default function AdminMenuEditor({ initialContent, initialImageDetails }: AdminMenuEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [activeField, setActiveField] = useState<MenuContentField | null>(null);
  const [titleDraft, setTitleDraft] = useState(initialContent.title);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const activeLabel = activeField === "title" ? "Menu Title" : "Menu Image";

  const closeModal = () => {
    setActiveField(null);
    setTitleDraft(content.title);
    setFile(null);
    setStatus("");
  };

  const saveMenuField = async (field: MenuContentField, value: string) => {
    const saveResponse = await fetch("/admin/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });

    if (!saveResponse.ok) {
      setStatus("Draft save failed.");
      return null;
    }

    const saveData = (await saveResponse.json()) as { content: { menu: MenuContent } };
    return saveData.content.menu;
  };

  const saveDraft = async () => {
    if (!activeField) return;
    setStatus("Saving draft...");

    if (activeField === "title") {
      const nextContent = await saveMenuField("title", titleDraft.trim() || content.title);
      if (!nextContent) return;
      setContent(nextContent);
      setStatus("Draft saved.");
      window.setTimeout(closeModal, 450);
      return;
    }

    if (!file) {
      closeModal();
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/admin/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      setStatus("Upload failed. Use JPG, PNG, WEBP, or SVG.");
      return;
    }

    const uploadData = (await uploadResponse.json()) as { src: string };
    const nextContent = await saveMenuField("image", uploadData.src);
    if (!nextContent) return;

    setContent(nextContent);
    setStatus("Draft saved.");
    window.setTimeout(closeModal, 450);
  };

  return (
    <>
      <MenuPageView basePath="/admin" content={content} isAdmin onEdit={setActiveField} />

      {activeField ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className="admin-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Menu Page</p>
            <h2>{activeLabel}</h2>
            {activeField === "title" ? (
              <label className="admin-upload-label">
                <span>Menu title</span>
                <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
              </label>
            ) : (
              <>
                <div className="admin-modal-preview">
                  <img src={previewUrl || content.image} alt="" />
                </div>
                <MenuAssetDetails details={initialImageDetails} />
                <label className="admin-upload-label">
                  <span>Upload replacement</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
              </>
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
