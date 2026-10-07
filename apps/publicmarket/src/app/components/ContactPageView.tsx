"use client";

import { useState } from "react";
import HolderPage from "./HolderPage";
import NewsletterSignup from "./NewsletterSignup";
import { getInstagramHref } from "@/lib/instagramLink";
import { trackContactLead } from "@/lib/tracking";
import type { ContactContent, ContactContentField } from "@/lib/siteContentSchema";
import { CONTACT_FIELD_LABELS } from "@/lib/siteContentSchema";

type ContactPageViewProps = {
  basePath?: string;
  content: ContactContent;
  isAdmin?: boolean;
  onEdit?: (field: ContactContentField) => void;
};

function getPhoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}


function ContactEditButton({
  field,
  onEdit,
}: {
  field: ContactContentField;
  onEdit?: (field: ContactContentField) => void;
}) {
  if (!onEdit) return null;

  return (
    <button
      className={`admin-edit-hotspot admin-edit-hotspot--contact-${field}`}
      type="button"
      onClick={() => onEdit(field)}
    >
      <span>Edit {CONTACT_FIELD_LABELS[field]}</span>
    </button>
  );
}

export default function ContactPageView({
  basePath = "",
  content,
  isAdmin = false,
  onEdit,
}: ContactPageViewProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAdmin) {
      setIsSubmitted(true);
      return;
    }
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !email) {
      setErrorMessage("Please enter your name and email.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/contact-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? "Submission failed. Please try again.");
        return;
      }
      setIsSubmitted(true);
      trackContactLead();
    } catch {
      setErrorMessage("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HolderPage basePath={basePath} label="page 4 holder - contact" pageClassName="page--contact">
      <section className="contact-page" aria-labelledby="contact-page-title">
        <div className={isAdmin ? "admin-contact-edit-target admin-contact-edit-target--title" : undefined}>
          <h1 id="contact-page-title">{content.title}</h1>
          {isAdmin ? <ContactEditButton field="title" onEdit={onEdit} /> : null}
        </div>

        <div className="contact-details" aria-label="Bar Phoebe contact details">
          <p className={isAdmin ? "admin-contact-edit-target admin-contact-edit-target--email" : undefined}>
            <a href={`mailto:${content.email}`}>{content.email}</a>
            {isAdmin ? <ContactEditButton field="email" onEdit={onEdit} /> : null}
          </p>
          <p className={isAdmin ? "admin-contact-edit-target admin-contact-edit-target--phone" : undefined}>
            <a href={getPhoneHref(content.phone)}>{content.phone}</a>
            {isAdmin ? <ContactEditButton field="phone" onEdit={onEdit} /> : null}
          </p>
          {(() => {
            const href = getInstagramHref(content.instagram);
            const linkText = (content.instagramLabel ?? "").trim();
            if (!linkText && !isAdmin) return null;
            return (
              <p className={isAdmin ? "admin-contact-edit-target admin-contact-edit-target--instagram" : undefined}>
                {linkText ? (
                  href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {linkText}
                    </a>
                  ) : (
                    <span>{linkText}</span>
                  )
                ) : (
                  <span>Instagram name not set</span>
                )}
                {isAdmin ? <ContactEditButton field="instagram" onEdit={onEdit} /> : null}
              </p>
            );
          })()}
        </div>

        <div className="contact-action">
          {isSubmitted ? (
            <div className="contact-completion" role="status">
              <p>Thank you.</p>
              <p>We will get back to you in the next couple of days.</p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <label>
                <span>Name</span>
                <input name="name" type="text" placeholder="Enter name" aria-label="Enter name" required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" placeholder="Enter email" aria-label="Enter email" required />
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" aria-label="Message" />
              </label>
              {errorMessage ? (
                <p className="contact-form-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit"}
              </button>
            </form>
          )}
        </div>

        {!isAdmin ? <NewsletterSignup /> : null}
      </section>
    </HolderPage>
  );
}
