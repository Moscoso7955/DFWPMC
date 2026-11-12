"use client";

import { initials, telHref, webHref, type Contact } from "@/lib/contactsShared";

/** Name, what they do, and tap-to-call / email / website. */
export default function ContactCard({ contact, compact = false }: { contact: Contact; compact?: boolean }) {
  return (
    <>
      <div className="ct-head">
        <span className="ct-avatar" aria-hidden="true">
          {initials(contact.name)}
        </span>
        <div>
          <strong>{contact.name}</strong>
          <span>{[contact.company !== contact.name ? contact.company : "", contact.what].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <div className="ct-actions">
        {contact.phone ? <a href={telHref(contact.phone)}>{compact ? "Call" : contact.phone}</a> : null}
        {contact.email ? <a href={`mailto:${contact.email}`}>{compact ? "Email" : contact.email}</a> : null}
        {contact.website && !compact ? (
          <a href={webHref(contact.website)} target="_blank" rel="noreferrer">
            {contact.website}
          </a>
        ) : null}
      </div>
    </>
  );
}
