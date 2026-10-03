"use client";
import { venuePath } from "@/lib/venue";
import { useMemo, useState } from "react";
import type { AssetDetails } from "@/lib/assetDetailsSchema";
import type { HomepageAssetDetails } from "@/lib/assetDetailsSchema";
import type { HomepageContent, HomepageContentField } from "@/lib/siteContentSchema";
import { HOMEPAGE_FIELD_LABELS } from "@/lib/siteContentSchema";
import SiteHomePage from "../components/SiteHomePage";
type AdminHomeEditorProps = {
    initialAssetDetails: HomepageAssetDetails;
    initialContent: HomepageContent;
};
function UploadLabel({ onFileChange }: {
    onFileChange: (file: File | null) => void;
}) {
    return (<label className="admin-upload-label">
      <span>Upload replacement</span>
      <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => onFileChange(event.target.files?.[0] || null)}/>
    </label>);
}
function AssetDetailsPanel({ details }: {
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
function HeroImageUploadSlot({ details, file, label, onFileChange, previewSrc, }: {
    details: AssetDetails;
    file: File | null;
    label: string;
    onFileChange: (file: File | null) => void;
    previewSrc: string;
}) {
    return (<section className="admin-hero-image-slot" aria-label={label}>
      <h3>{label}</h3>
      <div className="admin-modal-preview admin-modal-preview--slot">
        <img src={venuePath(previewSrc)} alt=""/>
      </div>
      <AssetDetailsPanel details={details}/>
      <UploadLabel onFileChange={onFileChange}/>
      {file ? <p className="admin-selected-file">Selected: {file.name}</p> : null}
    </section>);
}
export default function AdminHomeEditor({ initialAssetDetails, initialContent }: AdminHomeEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [activeField, setActiveField] = useState<HomepageContentField | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [heroImageOneFile, setHeroImageOneFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    const heroImageOnePreviewUrl = useMemo(() => (heroImageOneFile ? URL.createObjectURL(heroImageOneFile) : null), [heroImageOneFile]);
    const isHeroImagesEditor = activeField === "desktopHeroImage" || activeField === "mobileHeroImageOne" || activeField === "mobileHeroImageTwo";
    const activeLabel = activeField ? HOMEPAGE_FIELD_LABELS[activeField] : "";
    const activeSrc = activeField ? content[activeField] : "";
    const activeDetails = activeField ? initialAssetDetails[activeField] : null;
    const closeModal = () => {
        setActiveField(null);
        setFile(null);
        setHeroImageOneFile(null);
        setStatus("");
    };
    const uploadFile = async (nextFile: File) => {
        const formData = new FormData();
        formData.append("file", nextFile);
        const uploadResponse = await fetch(venuePath("/admin/api/upload"), {
            method: "POST",
            body: formData,
        });
        if (!uploadResponse.ok) {
            setStatus("Upload failed. Use JPG, PNG, WEBP, or SVG.");
            return null;
        }
        const uploadData = (await uploadResponse.json()) as {
            src: string;
        };
        return uploadData.src;
    };
    const saveHomepageField = async (field: HomepageContentField, src: string) => {
        const saveResponse = await fetch(venuePath("/admin/api/homepage"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, src }),
        });
        if (!saveResponse.ok) {
            setStatus("Draft save failed.");
            return null;
        }
        const saveData = (await saveResponse.json()) as {
            content: {
                homepage: HomepageContent;
            };
        };
        return saveData.content.homepage;
    };
    const saveHeroImagesDraft = async () => {
        if (!heroImageOneFile) {
            closeModal();
            return;
        }
        setStatus("Saving draft...");
        let nextContent: HomepageContent | null = null;
        if (heroImageOneFile) {
            const src = await uploadFile(heroImageOneFile);
            if (!src)
                return;
            nextContent = await saveHomepageField("desktopHeroImage", src);
            if (!nextContent)
                return;
        }
        if (nextContent)
            setContent(nextContent);
        setStatus("Draft saved.");
        window.setTimeout(closeModal, 450);
    };
    const saveDraft = async () => {
        if (isHeroImagesEditor) {
            await saveHeroImagesDraft();
            return;
        }
        if (!activeField || !file) {
            closeModal();
            return;
        }
        setStatus("Saving draft...");
        const uploadSrc = await uploadFile(file);
        if (!uploadSrc)
            return;
        const nextContent = await saveHomepageField(activeField, uploadSrc);
        if (!nextContent)
            return;
        setContent(nextContent);
        setStatus("Draft saved.");
        window.setTimeout(closeModal, 450);
    };
    return (<>
      <SiteHomePage basePath="/admin" content={content} isAdmin onEdit={setActiveField}/>

      {activeField ? (<div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${activeLabel}`}>
          <div className={isHeroImagesEditor ? "admin-modal-panel admin-modal-panel--wide" : "admin-modal-panel"}>
            <button className="admin-modal-close" type="button" aria-label="Close editor" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Homepage Asset</p>
            <h2>{activeLabel}</h2>
            {isHeroImagesEditor ? (<div className="admin-hero-image-slots">
                <HeroImageUploadSlot details={initialAssetDetails.desktopHeroImage} file={heroImageOneFile} label="HOMEPAGE BACKGROUND (DESKTOP & MOBILE)" onFileChange={setHeroImageOneFile} previewSrc={heroImageOnePreviewUrl || content.desktopHeroImage}/>
              </div>) : (<>
                <div className="admin-modal-preview">
                  <img src={venuePath(previewUrl || activeSrc)} alt=""/>
                </div>
                {activeDetails ? <AssetDetailsPanel details={activeDetails}/> : null}
                <UploadLabel onFileChange={setFile}/>
              </>)}
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
