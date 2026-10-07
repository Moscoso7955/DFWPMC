"use client";

import { useRef, useState } from "react";
import type { SectionField } from "@/lib/collective/sections";

type Props = {
  venueSlug: string;
  venueBasePath: string;
  sectionSlug: string;
  fields: SectionField[];
  initialValues: Record<string, string>;
};

type FieldStatus = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

/** Resolve a stored asset value to a URL the hub can display. */
function displayUrl(basePath: string, value: string): string {
  if (!value) return value;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith(`${basePath}/`)) return value;
  if (value.startsWith("/")) return `${basePath}${value}`;
  return value;
}

export default function SectionEditor({
  venueSlug,
  venueBasePath,
  sectionSlug,
  fields,
  initialValues,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saved, setSaved] = useState<Record<string, string>>(initialValues);
  const [status, setStatus] = useState<Record<string, FieldStatus>>({});

  const setFieldStatus = (name: string, next: FieldStatus) =>
    setStatus((prev) => ({ ...prev, [name]: next }));

  async function saveField(name: string, value: string) {
    setFieldStatus(name, { kind: "saving" });
    try {
      const response = await fetch("/admin/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue: venueSlug, section: sectionSlug, field: name, value }),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login?error=expired";
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "The change could not be saved.");
      }
      setValues((prev) => ({ ...prev, [name]: value }));
      setSaved((prev) => ({ ...prev, [name]: value }));
      setFieldStatus(name, { kind: "saved" });
    } catch (error) {
      setFieldStatus(name, {
        kind: "error",
        message: error instanceof Error ? error.message : "The change could not be saved.",
      });
    }
  }

  async function uploadImage(name: string, file: File) {
    setFieldStatus(name, { kind: "saving" });
    try {
      const form = new FormData();
      form.set("venue", venueSlug);
      form.set("file", file);
      const response = await fetch("/admin/api/upload", { method: "POST", body: form });
      if (response.status === 401) {
        window.location.href = "/admin/login?error=expired";
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | { src?: string; error?: string }
        | null;
      if (!response.ok || !body?.src) {
        throw new Error(body?.error ?? "The image could not be uploaded.");
      }
      await saveField(name, body.src);
    } catch (error) {
      setFieldStatus(name, {
        kind: "error",
        message: error instanceof Error ? error.message : "The image could not be uploaded.",
      });
    }
  }

  return (
    <div>
      {fields.map((field) => {
        const value = values[field.name] ?? "";
        const fieldStatus = status[field.name] ?? { kind: "idle" };
        const dirty = value !== (saved[field.name] ?? "");
        return (
          <section className="fwa-field" key={field.name}>
            <div className="fwa-field-head">
              <span className="fwa-field-label">{field.label}</span>
              <StatusText status={fieldStatus} dirty={dirty} />
            </div>
            {field.help ? <p className="fwa-field-help">{field.help}</p> : null}

            {field.kind === "image" ? (
              <ImageField
                field={field}
                value={value}
                basePath={venueBasePath}
                busy={fieldStatus.kind === "saving"}
                onUpload={(file) => uploadImage(field.name, file)}
              />
            ) : field.kind === "text" ? (
              <input
                className="fwa-input"
                value={value}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
              />
            ) : (
              <textarea
                className="fwa-textarea"
                value={value}
                spellCheck={field.kind !== "embed"}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
              />
            )}

            {field.kind !== "image" ? (
              <div className="fwa-field-foot">
                <button
                  className="fwa-btn"
                  type="button"
                  disabled={!dirty || fieldStatus.kind === "saving"}
                  onClick={() => saveField(field.name, value)}
                >
                  {fieldStatus.kind === "saving" ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function StatusText({ status, dirty }: { status: FieldStatus; dirty: boolean }) {
  if (status.kind === "error") {
    return <span className="fwa-field-status fwa-field-status--error">{status.message}</span>;
  }
  if (status.kind === "saving") return <span className="fwa-field-status">Saving…</span>;
  if (dirty) return <span className="fwa-field-status">Unsaved changes</span>;
  if (status.kind === "saved") {
    return <span className="fwa-field-status fwa-field-status--ok">Saved to draft</span>;
  }
  return null;
}

function ImageField({
  field,
  value,
  basePath,
  busy,
  onUpload,
}: {
  field: SectionField;
  value: string;
  basePath: string;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- venue CMS media is served by the venue apps, outside this app's image loader */}
          <img className="fwa-image-preview" src={displayUrl(basePath, value)} alt={field.label} />
          <p className="fwa-image-path">{value}</p>
        </>
      ) : (
        <p className="fwa-field-help">No image set yet.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.svg"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <div className="fwa-field-foot" style={{ justifyContent: "flex-start" }}>
        <button
          className="fwa-btn fwa-btn--ghost"
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
      </div>
    </div>
  );
}
