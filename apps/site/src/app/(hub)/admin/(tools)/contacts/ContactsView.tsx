"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseVCards, type Contact, type ContactInput } from "@/lib/contactsShared";
import ContactCard from "./ContactCard";

type Props = { contacts: Contact[]; plays: Record<string, { id: string; title: string }[]> };

const blank: ContactInput = { name: "", company: "", what: "", phone: "", email: "", website: "", notes: "", tags: [] };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { error?: string; added?: number; skipped?: number };
  if (!res.ok) throw new Error(data.error || "That didn't save.");
  return data;
}

export function ContactForm({ initial, onSave, onCancel, submit = "Save" }: { initial: ContactInput; onSave: (c: ContactInput) => Promise<void>; onCancel: () => void; submit?: string }) {
  const [c, setC] = useState({ ...initial, tags: (initial.tags ?? []).join(", ") });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof c, v: string) => setC((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="ct-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({ ...c, tags: c.tags.split(",").map((t) => t.trim()).filter(Boolean) });
        setBusy(false);
      }}
    >
      <label>
        <span>Name *</span>
        <input value={c.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
      </label>
      <label>
        <span>Company</span>
        <input value={c.company} onChange={(e) => set("company", e.target.value)} />
      </label>
      <label className="ct-wide">
        <span>What they do for us</span>
        <input value={c.what} onChange={(e) => set("what", e.target.value)} placeholder="e.g. Christmas lights install + take-down" />
      </label>
      <label>
        <span>Phone</span>
        <input value={c.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
      </label>
      <label>
        <span>Email</span>
        <input value={c.email} onChange={(e) => set("email", e.target.value)} type="email" />
      </label>
      <label>
        <span>Website</span>
        <input value={c.website} onChange={(e) => set("website", e.target.value)} />
      </label>
      <label>
        <span>Tags</span>
        <input value={c.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Decor, Vendor" />
      </label>
      <label className="ct-wide">
        <span>Notes</span>
        <textarea value={c.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="When to book, what they charged, what to ask for…" />
      </label>
      <div className="ct-wide ct-form-actions">
        <button type="submit" disabled={busy || !c.name?.trim()}>
          {busy ? "Saving…" : submit}
        </button>
        <button type="button" className="is-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ContactsView({ contacts, plays }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.company, c.what, c.notes, c.tags.join(" "), c.phone, c.email].join(" ").toLowerCase().includes(q));
  }, [contacts, query]);

  const run = async (fn: () => Promise<unknown>, done = "") => {
    setMessage("");
    try {
      await fn();
      setMessage(done);
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That didn't work.");
      return false;
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const cards = parseVCards(await file.text());
    if (!cards.length) {
      setMessage("No contacts found in that file. Share the contact as a contact card (.vcf).");
      return;
    }
    let summary = "";
    await run(async () => {
      const r = await call("POST", "/admin/api/contacts/import", { contacts: cards });
      summary = `Added ${r.added} contact${r.added === 1 ? "" : "s"}${r.skipped ? `; ${r.skipped} already here` : ""}.`;
    });
    if (summary) setMessage(summary);
  };

  return (
    <section className="admin-mailing-list pb">
      <a className="admin-back-link" href="/admin/playbook">
        <span aria-hidden="true">←</span> Playbook
      </a>
      <div className="admin-mailing-list-header">
        <h1>Contacts</h1>
      </div>
      <p className="admin-mailing-list-note">
        Vendors and outside help: who to call for the lights, the tree, the DJ. Attach them to plays and tasks so the right number
        is right there.
      </p>
      <div className="pb-actions">
        <button className="pb-btn" type="button" onClick={() => setAdding(true)}>
          + Add contact
        </button>
        <button className="pb-btn pb-btn--quiet" type="button" onClick={() => fileRef.current?.click()}>
          📇 Add from my phone
        </button>
        <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard,text/directory" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
        <input className="ct-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, company, what they do…" />
      </div>
      {message ? (
        <p className="admin-photos-warning" role="status">
          {message}
        </p>
      ) : null}
      {adding ? (
        <ContactForm
          initial={blank}
          submit="Add contact"
          onCancel={() => setAdding(false)}
          onSave={async (c) => {
            if (await run(() => call("POST", "/admin/api/contacts", c), "Added.")) setAdding(false);
          }}
        />
      ) : null}

      {shown.length ? (
        <ul className="ct-list">
          {shown.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="ct-editing">
                <ContactForm
                  initial={c}
                  onCancel={() => setEditing(null)}
                  onSave={async (next) => {
                    if (await run(() => call("PATCH", `/admin/api/contacts/${c.id}`, next))) setEditing(null);
                  }}
                />
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => window.confirm(`Delete ${c.name}? They come off every play too.`) && run(() => call("DELETE", `/admin/api/contacts/${c.id}`)).then(() => setEditing(null))}
                >
                  Delete contact
                </button>
              </li>
            ) : (
              <li key={c.id}>
                <ContactCard contact={c} />
                {c.notes ? <p>{c.notes}</p> : null}
                <div className="ct-foot">
                  {c.tags.map((t) => (
                    <span key={t} className="pb-unit-chip">
                      {t}
                    </span>
                  ))}
                  {plays[c.id]?.length ? (
                    <em>
                      In:{" "}
                      {plays[c.id].map((p, i) => (
                        <span key={p.id}>
                          {i ? ", " : ""}
                          <a href={`/admin/playbook/${p.id}`}>{p.title}</a>
                        </span>
                      ))}
                    </em>
                  ) : (
                    <em>Not in a play yet</em>
                  )}
                  <button type="button" className="is-quiet ct-edit" onClick={() => setEditing(c.id)}>
                    Edit
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="admin-pe-empty">{contacts.length ? "No matches." : "No contacts yet. Add the first one, or bring one in from your phone."}</p>
      )}

      <div className="ct-phone-tip">
        <strong>📇 Add from my phone</strong>
        <span>
          On iPhone: open the contact, tap Share Contact, then Save to Files. On Android: open the contact, Share, then save the .vcf file.
          Then tap Add from my phone here and pick it. Name, company, phone, email and website fill in.
        </span>
      </div>
    </section>
  );
}
