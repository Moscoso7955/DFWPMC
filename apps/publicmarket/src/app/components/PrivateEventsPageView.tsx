"use client";

import EmbedFrame from "./EmbedFrame";
import HolderPage from "./HolderPage";
import type { PrivateEventsContent, PrivateEventsContentField } from "@/lib/siteContentSchema";
import { PRIVATE_EVENTS_FIELD_LABELS } from "@/lib/siteContentSchema";

type PrivateEventsPageViewProps = {
  basePath?: string;
  content: PrivateEventsContent;
  isAdmin?: boolean;
  onEdit?: (field: PrivateEventsContentField) => void;
};

function PrivateEventsEditButton({
  field,
  onEdit,
}: {
  field: PrivateEventsContentField;
  onEdit?: (field: PrivateEventsContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button
      className={`admin-edit-hotspot admin-edit-hotspot--private-events-${field}`}
      type="button"
      onClick={() => onEdit(field)}
    >
      <span>Edit {PRIVATE_EVENTS_FIELD_LABELS[field]}</span>
    </button>
  );
}

export default function PrivateEventsPageView({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
}: PrivateEventsPageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 3 holder - private events" pageClassName="page--booking">
      <section className="booking-inquiry" aria-labelledby="booking-inquiry-title">
        <h1
          id="booking-inquiry-title"
          className={isAdmin ? "admin-private-events-edit-target" : undefined}
        >
          {content.title}
          {isAdmin ? <PrivateEventsEditButton field="title" onEdit={onEdit} /> : null}
        </h1>
        <div className={`booking-embed-band${isAdmin ? " admin-embed-edit-target" : ""}`}>
          <EmbedFrame embedCode={content.embedCode} emptyMessage="Inquiry form not yet configured." />
          {isAdmin ? <PrivateEventsEditButton field="embedCode" onEdit={onEdit} /> : null}
        </div>
      </section>
    </HolderPage>
  );
}
