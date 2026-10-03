"use client";
import { venuePath } from "@/lib/venue";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AssetDetails, StoryAssetDetails } from "@/lib/assetDetailsSchema";
import type { StoryContent, StoryContentField, StoryImageField } from "@/lib/siteContentSchema";
import { STORY_FIELD_LABELS, STORY_IMAGE_FIELDS } from "@/lib/siteContentSchema";
import StoryPageView from "@/app/components/StoryPageView";
type AdminStoryEditorProps = {
    initialAssetDetails: StoryAssetDetails;
    initialContent: StoryContent;
};
function isStoryImageField(field: StoryContentField | null): field is StoryImageField {
    return !!field && STORY_IMAGE_FIELDS.includes(field as StoryImageField);
}
function StoryAssetDetailsPanel({ details }: {
    details: AssetDetails;
}) {
    return (<div className="admin-asset-details" aria-label="Current file details">
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
    </div>);
}
export default function AdminStoryEditor({ initialAssetDetails, initialContent }: AdminStoryEditorProps) {
    const router = useRouter();
    const [content, setContent] = useState(initialContent);
    const [activeField, setActiveField] = useState<StoryContentField | null>(null);
    const [copyDraft, setCopyDraft] = useState(initialContent.copy);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    const activeLabel = activeField ? STORY_FIELD_LABELS[activeField] : "";
    const activeImageField = isStoryImageField(activeField) ? activeField : null;
    const closeModal = () => {
        setActiveField(null);
        setCopyDraft(content.copy);
        setFile(null);
        setStatus("");
    };
    const saveStoryField = async (field: StoryContentField, value: string) => {
        const saveResponse = await fetch(venuePath("/admin/api/story"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, value }),
        });
        if (!saveResponse.ok) {
            setStatus("Draft save failed.");
            return null;
        }
        const saveData = (await saveResponse.json()) as {
            content: {
                story: StoryContent;
            };
        };
        return saveData.content.story;
    };
    const saveDraft = async () => {
        if (!activeField)
            return;
        setStatus("Saving draft...");
        if (activeField === "copy") {
            const nextContent = await saveStoryField("copy", copyDraft);
            if (!nextContent)
                return;
            setContent(nextContent);
            setCopyDraft(nextContent.copy);
            router.refresh();
            setStatus("Draft saved.");
            window.setTimeout(() => {
                setActiveField(null);
                setFile(null);
                setStatus("");
            }, 450);
            return;
        }
        if (!file) {
            closeModal();
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(venuePath("/admin/api/upload"), {
            method: "POST",
            body: formData,
        });
        if (!uploadResponse.ok) {
            setStatus("Upload failed. Use JPG, PNG, WEBP, or SVG.");
            return;
        }
        const uploadData = (await uploadResponse.json()) as {
            src: string;
        };
        const nextContent = await saveStoryField(activeField, uploadData.src);
        if (!nextContent)
            return;
        setContent(nextContent);
        router.refresh();
        setStatus("Draft saved.");
        window.setTimeout(closeModal, 450);
    };
    return (<>
      <StoryPageView basePath="/admin" content={content} isAdmin onEdit={setActiveField}/>

      {activeField ? (<div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className={activeField === "copy" ? "admin-modal-panel admin-modal-panel--wide" : "admin-modal-panel"}>
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Story Page</p>
            <h2>{activeLabel}</h2>
            {activeField === "copy" ? (<label className="admin-upload-label">
                <span>Story copy</span>
                <textarea className="admin-textarea" value={copyDraft} onChange={(event) => setCopyDraft(event.target.value)}/>
              </label>) : activeImageField ? (<>
                <div className="admin-modal-preview">
                  <img src={venuePath(previewUrl || content[activeImageField])} alt=""/>
                </div>
                <StoryAssetDetailsPanel details={initialAssetDetails[activeImageField]}/>
                <label className="admin-upload-label">
                  <span>Upload replacement</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => setFile(event.target.files?.[0] || null)}/>
                </label>
              </>) : null}
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
