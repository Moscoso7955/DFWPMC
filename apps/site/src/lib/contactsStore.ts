import { sql } from "@vercel/postgres";
import type { Contact, ContactInput, PlayContact } from "./contactsShared";

// The venue's contact book, and which contacts belong to which plays and
// tasks (so "hang the lights" shows who to call).

let schemaReady: Promise<void> | null = null;

export function ensureContactsSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      create table if not exists venue_contacts (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        company text not null default '',
        what text not null default '',
        phone text not null default '',
        email text not null default '',
        website text not null default '',
        notes text not null default '',
        tags text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists playbook_contact_links (
        id uuid primary key default gen_random_uuid(),
        contact_id uuid not null references venue_contacts(id) on delete cascade,
        play_id uuid not null,
        task_id uuid,
        label text not null default '',
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists playbook_contact_links_play_idx on playbook_contact_links (play_id)`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const tagsOf = (v: unknown) =>
  [...new Set((Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((t) => clean(t, 30)).filter(Boolean))].slice(0, 10);

function toContact(r: Record<string, unknown>): Contact {
  return {
    id: r.id as string,
    name: r.name as string,
    company: r.company as string,
    what: r.what as string,
    phone: r.phone as string,
    email: r.email as string,
    website: r.website as string,
    notes: r.notes as string,
    tags: ((r.tags as string) || "").split(",").filter(Boolean),
  };
}

function fields(input: ContactInput) {
  return {
    name: clean(input.name, 120),
    company: clean(input.company, 120),
    what: clean(input.what, 200),
    phone: clean(input.phone, 40),
    email: clean(input.email, 200).toLowerCase(),
    website: clean(input.website, 300).replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    notes: clean(input.notes, 4000),
    tags: tagsOf(input.tags).join(","),
  };
}

export async function listContacts(): Promise<Contact[]> {
  await ensureContactsSchema();
  const { rows } = await sql`select * from venue_contacts order by lower(name)`;
  return rows.map(toContact);
}

/** Contact id -> the plays it's in, for the contacts page. */
export async function contactPlays(): Promise<Record<string, { id: string; title: string }[]>> {
  await ensureContactsSchema();
  const { rows } = await sql`select to_regclass('playbook_plays') as t`;
  if (!rows[0]?.t) return {};
  const { rows: links } = await sql`
    select distinct l.contact_id, p.id, p.title, p.target_date from playbook_contact_links l
    join playbook_plays p on p.id = l.play_id where not p.is_template
    order by p.target_date desc
  `;
  const map: Record<string, { id: string; title: string }[]> = {};
  for (const l of links) (map[l.contact_id as string] ??= []).push({ id: l.id as string, title: l.title as string });
  return map;
}

export async function saveContact(input: ContactInput, id?: string): Promise<{ ok: true; contact: Contact } | { ok: false; error: string }> {
  await ensureContactsSchema();
  const f = fields(input);
  if (!f.name) return { ok: false, error: "Add a name." };
  const { rows } = id
    ? await sql`
        update venue_contacts set name = ${f.name}, company = ${f.company}, what = ${f.what}, phone = ${f.phone}, email = ${f.email},
          website = ${f.website}, notes = ${f.notes}, tags = ${f.tags}, updated_at = now()
        where id = ${id} returning *
      `
    : await sql`
        insert into venue_contacts (name, company, what, phone, email, website, notes, tags)
        values (${f.name}, ${f.company}, ${f.what}, ${f.phone}, ${f.email}, ${f.website}, ${f.notes}, ${f.tags})
        returning *
      `;
  return rows[0] ? { ok: true, contact: toContact(rows[0]) } : { ok: false, error: "Not found." };
}

export async function deleteContact(id: string) {
  await ensureContactsSchema();
  await sql`delete from venue_contacts where id = ${id}`;
}

/** Adds contacts from shared contact cards; skips ones already here (same name + phone or email). */
export async function importContacts(list: ContactInput[]): Promise<{ added: number; skipped: number }> {
  await ensureContactsSchema();
  let added = 0;
  let skipped = 0;
  for (const input of list.slice(0, 500)) {
    const f = fields(input);
    if (!f.name) continue;
    const { rows } = await sql`
      select 1 from venue_contacts
      where lower(name) = lower(${f.name}) and ((${f.phone} <> '' and phone = ${f.phone}) or (${f.email} <> '' and lower(email) = ${f.email}))
      limit 1
    `;
    if (rows[0]) {
      skipped++;
      continue;
    }
    await saveContact(input);
    added++;
  }
  return { added, skipped };
}

// ---------------------------------------------------------------------------
// Links to plays and tasks
// ---------------------------------------------------------------------------

export async function playContacts(playId: string): Promise<PlayContact[]> {
  await ensureContactsSchema();
  const { rows } = await sql`
    select l.id as link_id, l.task_id, l.label, c.* from playbook_contact_links l
    join venue_contacts c on c.id = l.contact_id
    where l.play_id = ${playId}
    order by l.created_at
  `;
  return rows.map((r) => ({ linkId: r.link_id as string, taskId: (r.task_id as string | null) ?? null, label: r.label as string, contact: toContact(r) }));
}

export async function linkContact(playId: string, contactId: string, taskId: string | null, label: string): Promise<string | null> {
  await ensureContactsSchema();
  const { rows: existing } = await sql`
    select id from playbook_contact_links where play_id = ${playId} and contact_id = ${contactId} and task_id is not distinct from ${taskId}::uuid
  `;
  if (existing[0]) return existing[0].id as string;
  const { rows } = await sql`
    insert into playbook_contact_links (contact_id, play_id, task_id, label)
    select ${contactId}, ${playId}, ${taskId}, ${clean(label, 60)}
    where exists (select 1 from venue_contacts where id = ${contactId})
    returning id
  `;
  return (rows[0]?.id as string | undefined) ?? null;
}

export async function unlinkContact(playId: string, linkId: string) {
  await ensureContactsSchema();
  await sql`delete from playbook_contact_links where id = ${linkId} and play_id = ${playId}`;
}

/** Brings a play's contacts along when it's copied (tasks matched by copy_of). */
export async function copyPlayContacts(sourceId: string, newId: string) {
  await ensureContactsSchema();
  await sql`
    insert into playbook_contact_links (contact_id, play_id, task_id, label)
    select l.contact_id, ${newId}, nt.id, l.label
    from playbook_contact_links l
    left join playbook_tasks nt on nt.play_id = ${newId} and nt.copy_of = l.task_id
    where l.play_id = ${sourceId} and (l.task_id is null or nt.id is not null)
  `;
}
