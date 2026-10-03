"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlackbookEntry, BlackbookStatus } from "@/lib/blackbookStore";

type BlackbookViewProps = {
  initialEntries: BlackbookEntry[];
  canEdit: boolean;
};

type DraftState = {
  id: number | null;
  name: string;
  photoUrl: string;
  notes: string;
  status: BlackbookStatus;
};

const EMPTY_DRAFT: DraftState = { id: null, name: "", photoUrl: "", notes: "", status: "vip" };

export default function BlackbookView({ initialEntries, canEdit }: BlackbookViewProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<BlackbookStatus>("vip");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expandedPhoto) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedPhoto(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedPhoto]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => entry.status === tab)
      .filter((entry) => (query ? entry.name.toLowerCase().includes(query) : true));
  }, [entries, search, tab]);

  const vipCount = entries.filter((entry) => entry.status === "vip").length;
  const bannedCount = entries.filter((entry) => entry.status === "banned").length;

  const openNew = (status: BlackbookStatus) => {
    setDraft({ ...EMPTY_DRAFT, status });
    setStatus("");
  };

  const openEdit = (entry: BlackbookEntry) => {
    setDraft({
      id: entry.id,
      name: entry.name,
      photoUrl: entry.photoUrl,
      notes: entry.notes,
      status: entry.status,
    });
    setStatus("");
  };

  const closeModal = () => {
    setDraft(null);
    setStatus("");
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    setStatus("Uploading photo...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/blackbook/api/upload", { method: "POST", body: formData });
      if (!response.ok) {
        setStatus("Upload failed.");
        return;
      }
      const data = (await response.json()) as { src: string };
      setDraft({ ...draft, photoUrl: data.src });
      setStatus("");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setStatus("Name is required.");
      return;
    }
    setStatus("Saving...");
    const isUpdate = draft.id !== null;
    const url = isUpdate ? `/blackbook/api/entries/${draft.id}` : "/blackbook/api/entries";
    const method = isUpdate ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        photoUrl: draft.photoUrl,
        notes: draft.notes,
        status: draft.status,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(data.error ?? "Save failed.");
      return;
    }

    const data = (await response.json()) as { entry: BlackbookEntry };
    if (isUpdate) {
      setEntries((current) => current.map((entry) => (entry.id === data.entry.id ? data.entry : entry)));
    } else {
      setEntries((current) =>
        [...current, data.entry].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    setTab(data.entry.status);
    closeModal();
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!window.confirm(`Remove ${draft.name} from the Blackbook?`)) return;
    setStatus("Removing...");
    const response = await fetch(`/blackbook/api/entries/${draft.id}`, { method: "DELETE" });
    if (!response.ok) {
      setStatus("Remove failed.");
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== draft.id));
    closeModal();
  };

  const logOut = async () => {
    await fetch("/blackbook/api/logout", { method: "POST" });
    window.location.href = "/blackbook/login";
  };

  return (
    <main className="blackbook-shell">
      <header className="blackbook-header">
        <h1>
          Blackbook
          {!canEdit ? <span className="blackbook-role-badge">View only</span> : null}
        </h1>
        <button type="button" className="blackbook-logout" onClick={logOut}>
          Log Out
        </button>
      </header>

      <div className="blackbook-toolbar">
        <div className="blackbook-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "vip"}
            className={tab === "vip" ? "blackbook-tab blackbook-tab--active" : "blackbook-tab"}
            onClick={() => setTab("vip")}
          >
            VIPs ({vipCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "banned"}
            className={tab === "banned" ? "blackbook-tab blackbook-tab--active" : "blackbook-tab"}
            onClick={() => setTab("banned")}
          >
            Banned ({bannedCount})
          </button>
        </div>
        <input
          className="blackbook-search"
          type="search"
          placeholder="Search by name"
          aria-label="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canEdit ? (
          <button type="button" className="blackbook-add" onClick={() => openNew(tab)}>
            Add {tab === "vip" ? "VIP" : "Banned"}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="blackbook-empty">No entries yet.</p>
      ) : (
        <ul className="blackbook-grid">
          {filtered.map((entry) => (
            <li key={entry.id} className={`blackbook-card blackbook-card--${entry.status}`}>
              <button type="button" className="blackbook-card-button" onClick={() => openEdit(entry)}>
                <span className="blackbook-photo" aria-hidden="true">
                  {entry.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={entry.photoUrl} alt="" />
                  ) : (
                    <span className="blackbook-photo-placeholder">{entry.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="blackbook-card-meta">
                  <span className="blackbook-card-name">{entry.name}</span>
                  {entry.notes ? <span className="blackbook-card-notes">{entry.notes}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Blackbook entry">
          <div className="admin-modal-panel blackbook-modal-panel">
            <button className="admin-modal-close" type="button" aria-label="Close" onClick={closeModal}>
              X
            </button>
            <p className="admin-modal-kicker">Blackbook</p>
            <h2>{canEdit ? (draft.id ? "Edit Entry" : "New Entry") : draft.name || "Entry"}</h2>

            {canEdit ? (
              <>
                <label className="admin-upload-label">
                  <span>Name</span>
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>

                <label className="admin-upload-label">
                  <span>Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value as BlackbookStatus })}
                  >
                    <option value="vip">VIP</option>
                    <option value="banned">Banned</option>
                  </select>
                </label>

                <label className="admin-upload-label">
                  <span>Notes</span>
                  <textarea
                    rows={4}
                    value={draft.notes}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    placeholder="Drink preferences, regulars notes, reason banned, etc."
                  />
                </label>

                <div className="blackbook-photo-edit">
                  {draft.photoUrl ? (
                    <button
                      type="button"
                      className="blackbook-photo blackbook-photo--large blackbook-photo--zoomable"
                      onClick={() => setExpandedPhoto(draft.photoUrl)}
                      aria-label="View photo full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.photoUrl} alt="" />
                    </button>
                  ) : (
                    <div className="blackbook-photo blackbook-photo--large" aria-hidden="true">
                      <span className="blackbook-photo-placeholder">
                        {draft.name ? draft.name.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}
                  <div className="blackbook-photo-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="blackbook-file-input"
                      onChange={handleFile}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      className="blackbook-photo-pick"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : draft.photoUrl ? "Change Photo" : "Upload Photo"}
                    </button>
                    {draft.photoUrl ? (
                      <button
                        type="button"
                        className="blackbook-photo-clear"
                        onClick={() => setDraft({ ...draft, photoUrl: "" })}
                      >
                        Remove Photo
                      </button>
                    ) : null}
                  </div>
                </div>

                {status ? <p className="admin-modal-status">{status}</p> : null}

                <div className="admin-modal-actions">
                  <button type="button" onClick={save} disabled={uploading}>
                    {draft.id ? "Save Changes" : "Add Entry"}
                  </button>
                  {draft.id ? (
                    <button type="button" className="blackbook-delete" onClick={remove}>
                      Remove
                    </button>
                  ) : null}
                  <button type="button" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="blackbook-readonly">
                  {draft.photoUrl ? (
                    <button
                      type="button"
                      className="blackbook-photo blackbook-photo--large blackbook-photo--zoomable"
                      onClick={() => setExpandedPhoto(draft.photoUrl)}
                      aria-label="View photo full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.photoUrl} alt="" />
                    </button>
                  ) : (
                    <div className="blackbook-photo blackbook-photo--large" aria-hidden="true">
                      <span className="blackbook-photo-placeholder">
                        {draft.name ? draft.name.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}
                  <dl className="blackbook-readonly-meta">
                    <dt>Status</dt>
                    <dd>{draft.status === "vip" ? "VIP" : "Banned"}</dd>
                    {draft.notes ? (
                      <>
                        <dt>Notes</dt>
                        <dd>{draft.notes}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
                <div className="admin-modal-actions">
                  <button type="button" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {expandedPhoto ? (
        <div
          className="blackbook-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setExpandedPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expandedPhoto} alt="" />
        </div>
      ) : null}
    </main>
  );
}
