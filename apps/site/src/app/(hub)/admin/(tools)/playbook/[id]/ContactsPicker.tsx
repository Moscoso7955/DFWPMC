"use client";

import { useState } from "react";
import { initials, telHref, type Contact, type PlayContact } from "@/lib/contactsShared";
import { api } from "../playbookClient";
import type { PlayApi } from "./usePlay";

type Props = {
  playId: string;
  taskId: string | null;
  attached: PlayContact[];
  all: Contact[];
  canEdit: boolean;
  p: PlayApi;
};

/** Contacts on a task (or the play): call/email, attach an existing one, or add a new one. */
export default function ContactsPicker({ playId, taskId, attached, all, canEdit, p }: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", what: "" });
  const base = `/admin/api/playbook/plays/${playId}/contacts`;
  const taken = new Set(attached.map((a) => a.contact.id));
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((c) => !taken.has(c.id) && [c.name, c.company, c.what].join(" ").toLowerCase().includes(q)).slice(0, 6) : [];

  return (
    <div className="ct-picker">
      {attached.map((a) => (
        <div key={a.linkId} className="ct-pill">
          <span className="ct-avatar" aria-hidden="true">
            {initials(a.contact.name)}
          </span>
          <div>
            <strong>{a.contact.name}</strong>
            <em>{[a.contact.company !== a.contact.name ? a.contact.company : "", a.contact.what].filter(Boolean).join(" · ")}</em>
          </div>
          {a.contact.phone ? <a href={telHref(a.contact.phone)}>Call</a> : null}
          {a.contact.email ? <a href={`mailto:${a.contact.email}`}>Email</a> : null}
          {canEdit ? (
            <button type="button" className="is-quiet" aria-label={`Remove ${a.contact.name}`} onClick={() => p.run(() => api("DELETE", `${base}/${a.linkId}`))}>
              ✕
            </button>
          ) : null}
        </div>
      ))}
      {canEdit ? (
        adding ? (
          <div className="ct-quick">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" autoFocus />
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" type="tel" />
            <input value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} placeholder="What they do" />
            <button
              type="button"
              disabled={!draft.name.trim() || p.busy}
              onClick={async () => {
                if (await p.run(() => api("POST", base, { contact: draft, taskId }))) {
                  setDraft({ name: "", phone: "", what: "" });
                  setAdding(false);
                }
              }}
            >
              Add + attach
            </button>
            <button type="button" className="is-quiet" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="ct-attach">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="+ Attach a contact (search)" aria-label="Attach a contact" />
            {matches.length ? (
              <ul>
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await p.run(() => api("POST", base, { contactId: c.id, taskId }))) setQuery("");
                      }}
                    >
                      <strong>{c.name}</strong> {c.what ? <em>{c.what}</em> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="is-quiet" onClick={() => { setAdding(true); setDraft({ ...draft, name: query }); }}>
              + New contact
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
