"use client";

import EmbedFrame from "./EmbedFrame";
import HolderPage from "./HolderPage";
import type { CareersContent, CareersContentField } from "@/lib/siteContentSchema";
import { CAREERS_FIELD_LABELS } from "@/lib/siteContentSchema";

type CareersPageViewProps = {
  basePath?: string;
  content: CareersContent;
  isAdmin?: boolean;
  onEdit?: (field: CareersContentField) => void;
};

function CareersEditButton({
  field,
  onEdit,
}: {
  field: CareersContentField;
  onEdit?: (field: CareersContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button
      className={`admin-edit-hotspot admin-edit-hotspot--careers-${field}`}
      type="button"
      onClick={() => onEdit(field)}
    >
      <span>Edit {CAREERS_FIELD_LABELS[field]}</span>
    </button>
  );
}

export default function CareersPageView({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
}: CareersPageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 5 holder - careers" pageClassName="page--careers">
      <section className="careers-page" aria-labelledby="careers-page-title">
        <h1 id="careers-page-title" className={isAdmin ? "admin-careers-edit-target" : undefined}>
          {content.title}
          {isAdmin ? <CareersEditButton field="title" onEdit={onEdit} /> : null}
        </h1>
        <div className={`careers-embed-band${isAdmin ? " admin-embed-edit-target" : ""}`}>
          <EmbedFrame
            embedCode={content.embedCode}
            emptyMessage="Job application form not yet configured."
          />
          {isAdmin ? <CareersEditButton field="embedCode" onEdit={onEdit} /> : null}
        </div>
      </section>
    </HolderPage>
  );
}
