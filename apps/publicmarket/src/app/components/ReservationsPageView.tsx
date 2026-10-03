"use client";

import EmbedFrame from "./EmbedFrame";
import HolderPage from "./HolderPage";
import type { ReservationsContent, ReservationsContentField } from "@/lib/siteContentSchema";
import { RESERVATIONS_FIELD_LABELS } from "@/lib/siteContentSchema";

type ReservationsPageViewProps = {
  basePath?: string;
  content: ReservationsContent;
  isAdmin?: boolean;
  onEdit?: (field: ReservationsContentField) => void;
};

function ReservationsEditButton({
  field,
  onEdit,
}: {
  field: ReservationsContentField;
  onEdit?: (field: ReservationsContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button
      className={`admin-edit-hotspot admin-edit-hotspot--reservations-${field}`}
      type="button"
      onClick={() => onEdit(field)}
    >
      <span>Edit {RESERVATIONS_FIELD_LABELS[field]}</span>
    </button>
  );
}

export default function ReservationsPageView({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
}: ReservationsPageViewProps) {
  return (
    <HolderPage basePath={basePath} label="page 6 holder - reservations" pageClassName="page--reservations">
      <section className="reservations-page" aria-labelledby="reservations-page-title">
        <h1 id="reservations-page-title" className={isAdmin ? "admin-reservations-edit-target" : undefined}>
          {content.title}
          {isAdmin ? <ReservationsEditButton field="title" onEdit={onEdit} /> : null}
        </h1>
        <div className={`reservations-embed-band${isAdmin ? " admin-embed-edit-target" : ""}`}>
          <EmbedFrame
            embedCode={content.embedCode}
            emptyMessage="Reservation form not yet configured."
          />
          {isAdmin ? <ReservationsEditButton field="embedCode" onEdit={onEdit} /> : null}
        </div>
      </section>
    </HolderPage>
  );
}
