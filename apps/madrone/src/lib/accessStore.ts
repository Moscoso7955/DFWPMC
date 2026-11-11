import { createHash, randomBytes } from "node:crypto";
import { sql } from "@vercel/postgres";
import { ADMIN_ROLE, AREA_IDS, BUILTIN_ROLES, isArea, type AreaId, type Role, type UserStatus, type VenueUser } from "./accessShared";

// The venue's users and roles. Sign-in is Google and invite-only: a user
// can sign in once they're invited, with the Google account for the
// invited email. The venue's ADMIN_EMAIL is always Admin.

export const INVITE_DAYS = 7;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      create table if not exists venue_users (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        email text not null default '',
        roles text[] not null default '{}',
        status text not null default 'pending' check (status in ('pending', 'invited', 'active', 'disabled')),
        google_sub text,
        invite_hash text,
        invite_expires_at timestamptz,
        invited_at timestamptz,
        last_sign_in_at timestamptz,
        session_version int not null default 1,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create unique index if not exists venue_users_email_idx on venue_users (lower(email)) where email <> ''`;
    await sql`
      create table if not exists venue_roles (
        id text primary key,
        name text not null,
        areas text[] not null default '{}',
        builtin boolean not null default false,
        sort int not null default 0
      )
    `;
    await sql`create table if not exists venue_settings (key text primary key, value text not null)`;
    for (const [i, role] of BUILTIN_ROLES.entries()) {
      await sql`
        insert into venue_roles (id, name, areas, builtin, sort)
        values (${role.id}, ${role.name}, array(select jsonb_array_elements_text(${json(role.areas)}::jsonb)), true, ${i})
        on conflict (id) do nothing
      `;
    }
    await sql`alter table venue_users add column if not exists update_emails boolean not null default false`;
    // The Admin starts with the morning feature emails switched on; everyone
    // else opts in from the People page.
    const { rows: seeded } = await sql`select value from venue_settings where key = 'update_emails_seeded'`;
    if (!seeded[0]) {
      const owner = ownerEmail();
      if (owner) await sql`update venue_users set update_emails = true where lower(email) = ${owner}`;
      await sql`insert into venue_settings (key, value) values ('update_emails_seeded', ${new Date().toISOString()}) on conflict (key) do nothing`;
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

/** For other modules that join on venue_users. */
export const ensureAccessSchema = () => ensureSchema();

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
/** A text list as a JSON parameter; SQL turns it back with textArray(). */
const json = (list: string[]) => JSON.stringify(list);
export const ownerEmail = () => (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

function toUser(r: Record<string, unknown>): VenueUser {
  const email = r.email as string;
  const isOwner = Boolean(email) && email.toLowerCase() === ownerEmail();
  const roles = (r.roles as string[]) ?? [];
  return {
    id: r.id as string,
    name: r.name as string,
    email,
    roles: isOwner && !roles.includes(ADMIN_ROLE) ? [ADMIN_ROLE, ...roles] : roles,
    status: r.status as UserStatus,
    invitedAt: iso(r.invited_at),
    inviteExpiresAt: iso(r.invite_expires_at),
    lastSignInAt: iso(r.last_sign_in_at),
    isOwner,
    updateEmails: Boolean(r.update_emails),
  };
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function listRoles(): Promise<Role[]> {
  await ensureSchema();
  const { rows } = await sql`select * from venue_roles order by sort, name`;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    // Admin always has everything, including areas added later.
    areas: r.id === ADMIN_ROLE ? AREA_IDS : ((r.areas as string[]) ?? []).filter(isArea),
    builtin: Boolean(r.builtin),
    sort: Number(r.sort),
  }));
}

export async function setRoleArea(roleId: string, area: AreaId, on: boolean) {
  if (roleId === ADMIN_ROLE || !isArea(area)) return;
  await ensureSchema();
  if (on) await sql`update venue_roles set areas = array_append(array_remove(areas, ${area}), ${area}) where id = ${roleId}`;
  else await sql`update venue_roles set areas = array_remove(areas, ${area}) where id = ${roleId}`;
}

export async function createRole(name: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureSchema();
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!clean) return { ok: false, error: "Name the role." };
  const base = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "role";
  let id = base;
  for (let i = 2; ; i++) {
    const { rows } = await sql`select 1 from venue_roles where id = ${id}`;
    if (!rows[0]) break;
    id = `${base}-${i}`;
  }
  const { rows } = await sql`select coalesce(max(sort), 0) + 1 as s from venue_roles`;
  await sql`insert into venue_roles (id, name, areas, builtin, sort) values (${id}, ${clean}, '{}', false, ${Number(rows[0].s)})`;
  return { ok: true, id };
}

export async function renameRole(roleId: string, name: string) {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!clean || roleId === ADMIN_ROLE) return;
  await ensureSchema();
  await sql`update venue_roles set name = ${clean} where id = ${roleId}`;
}

export async function deleteRole(roleId: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const { rows } = await sql`select builtin from venue_roles where id = ${roleId}`;
  if (!rows[0]) return { ok: true };
  if (rows[0].builtin) return { ok: false, error: "Built-in roles can't be deleted." };
  await sql`update venue_users set roles = array_remove(roles, ${roleId})`;
  await sql`delete from venue_roles where id = ${roleId}`;
  return { ok: true };
}

/** Every area a set of roles grants. */
export async function areasFor(roleIds: string[]): Promise<Set<AreaId>> {
  if (roleIds.includes(ADMIN_ROLE)) return new Set(AREA_IDS);
  const roles = await listRoles();
  return new Set(roles.filter((r) => roleIds.includes(r.id)).flatMap((r) => r.areas));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<VenueUser[]> {
  await ensureSchema();
  const { rows } = await sql`select * from venue_users order by (status = 'disabled'), lower(name)`;
  const users = rows.map(toUser);
  return users.sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
}

export async function getUser(id: string): Promise<VenueUser | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await ensureSchema();
  const { rows } = await sql`select * from venue_users where id = ${id}`;
  return rows[0] ? toUser(rows[0]) : null;
}

/** For the session check: the user and their current session version. */
export async function getSessionUser(id: string): Promise<(VenueUser & { sessionVersion: number }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await ensureSchema();
  const { rows } = await sql`select * from venue_users where id = ${id}`;
  return rows[0] ? { ...toUser(rows[0]), sessionVersion: Number(rows[0].session_version) } : null;
}

const cleanRoles = async (roles: unknown) => {
  const known = new Set((await listRoles()).map((r) => r.id));
  return Array.isArray(roles) ? [...new Set(roles.filter((r): r is string => typeof r === "string" && known.has(r) && r !== ADMIN_ROLE))] : [];
};

export type SaveResult = { ok: true; user: VenueUser } | { ok: false; error: string };

export async function addUser(input: { name?: unknown; email?: unknown; roles?: unknown }): Promise<SaveResult> {
  await ensureSchema();
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 200) : "";
  if (!name) return { ok: false, error: "Add their name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right." };
  const roles = await cleanRoles(input.roles);
  try {
    const { rows } = await sql`insert into venue_users (name, email, roles) values (${name}, ${email}, array(select jsonb_array_elements_text(${json(roles)}::jsonb))) returning *`;
    return { ok: true, user: toUser(rows[0]) };
  } catch {
    return { ok: false, error: "Someone with that email is already on the list." };
  }
}

export async function updateUser(id: string, input: { name?: unknown; email?: unknown; roles?: unknown }): Promise<SaveResult> {
  await ensureSchema();
  const current = await getUser(id);
  if (!current) return { ok: false, error: "Not found." };
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 80) : current.name;
  let email = current.email;
  if (typeof input.email === "string" && !current.isOwner) {
    email = input.email.trim().toLowerCase().slice(0, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email doesn't look right." };
  }
  const roles = input.roles === undefined ? current.roles.filter((r) => r !== ADMIN_ROLE) : await cleanRoles(input.roles);
  const emailChanged = email !== current.email;
  try {
    const { rows } = await sql`
      update venue_users set name = ${name}, email = ${email}, roles = array(select jsonb_array_elements_text(${json(roles)}::jsonb)),
        google_sub = case when ${emailChanged} then null else google_sub end,
        status = case when ${emailChanged} and status <> 'disabled' then 'pending' else status end,
        invite_hash = case when ${emailChanged} then null else invite_hash end,
        session_version = session_version + case when ${emailChanged} or roles is distinct from array(select jsonb_array_elements_text(${json(roles)}::jsonb)) then 1 else 0 end
      where id = ${id} returning *
    `;
    return { ok: true, user: toUser(rows[0]) };
  } catch {
    return { ok: false, error: "Someone with that email is already on the list." };
  }
}

/** Switch someone's morning feature emails on or off. */
export async function setUpdateEmails(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const { rows } = await sql`update venue_users set update_emails = ${on} where id = ${id} returning email`;
  if (!rows[0]) return { ok: false, error: "Not found." };
  if (on && !rows[0].email) return { ok: true, error: "Add their email so the update can reach them." };
  return { ok: true };
}

/** Who gets the feature emails: switched on, has an email, not turned off. First names for the greeting. */
export async function listUpdateRecipients(): Promise<{ name: string; email: string }[]> {
  await ensureSchema();
  const { rows } = await sql`
    select name, email from venue_users
    where update_emails and email <> '' and status <> 'disabled'
    order by lower(name)
  `;
  return rows.map((r) => ({ name: String(r.name).trim().split(/\s+/)[0] || String(r.name), email: String(r.email) }));
}

/** Turn off (signed out everywhere, can't sign in) or back on. */
export async function setUserDisabled(id: string, disabled: boolean): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const user = await getUser(id);
  if (!user) return { ok: false, error: "Not found." };
  if (user.isOwner) return { ok: false, error: "The venue's Admin can't be turned off." };
  if (disabled) await sql`update venue_users set status = 'disabled', invite_hash = null, session_version = session_version + 1 where id = ${id}`;
  else await sql`update venue_users set status = case when last_sign_in_at is null then 'pending' else 'active' end where id = ${id} and status = 'disabled'`;
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const user = await getUser(id);
  if (!user) return { ok: true };
  if (user.isOwner) return { ok: false, error: "The venue's Admin can't be removed." };
  // Their Playbook tasks keep their name (once the Playbook exists here).
  const { rows } = await sql`select to_regclass('playbook_tasks') as t`;
  if (rows[0]?.t) {
    await sql`update playbook_tasks set owner_label = ${user.name}, owner_id = null where owner_id = ${id}`;
    await sql`update playbook_plays set owner_id = null where owner_id = ${id}`;
  }
  await sql`delete from venue_users where id = ${id}`;
  return { ok: true };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A fresh invite link for a user (the old one stops working). */
export async function createInvite(id: string): Promise<{ ok: true; token: string; user: VenueUser } | { ok: false; error: string }> {
  await ensureSchema();
  const user = await getUser(id);
  if (!user) return { ok: false, error: "Not found." };
  if (!user.email) return { ok: false, error: "Add their email first." };
  if (user.status === "disabled") return { ok: false, error: "Turn them back on first." };
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000).toISOString();
  const { rows } = await sql`
    update venue_users set invite_hash = ${hashToken(token)}, invite_expires_at = ${expires}, invited_at = now(),
      status = case when status = 'active' then 'active' else 'invited' end
    where id = ${id} returning *
  `;
  return { ok: true, token, user: toUser(rows[0]) };
}

export async function cancelInvite(id: string) {
  await ensureSchema();
  await sql`update venue_users set invite_hash = null, invite_expires_at = null, status = case when status = 'invited' then 'pending' else status end where id = ${id}`;
}

export async function findInvite(token: string): Promise<VenueUser | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  await ensureSchema();
  const { rows } = await sql`
    select * from venue_users where invite_hash = ${hashToken(token)} and invite_expires_at > now() and status <> 'disabled' limit 1
  `;
  return rows[0] ? toUser(rows[0]) : null;
}

export type SignInResult =
  | { ok: true; user: VenueUser & { sessionVersion: number }; firstOwnerSignIn: boolean }
  | { ok: false; reason: "not_invited" | "expired" | "disabled" | "mismatch" | "wrong_account" };

/**
 * Completes a Google sign-in. The Google email must be a user here that
 * was invited (or the venue's ADMIN_EMAIL). If they came from an invite
 * link, the invite's email must be the one they signed in with.
 */
export async function completeSignIn(input: { email: string; sub: string; name: string; inviteToken: string | null }): Promise<SignInResult> {
  await ensureSchema();
  const email = input.email.trim().toLowerCase();
  if (input.inviteToken) {
    const invited = await findInvite(input.inviteToken);
    if (invited && invited.email.toLowerCase() !== email) return { ok: false, reason: "wrong_account" };
  }
  const { rows } = await sql`select * from venue_users where lower(email) = ${email} limit 1`;
  let row = rows[0];
  const isOwner = email === ownerEmail() && Boolean(email);
  if (!row && isOwner) {
    const created = await sql`insert into venue_users (name, email, roles, status, update_emails) values (${input.name || email}, ${email}, array['admin']::text[], 'active', true) returning *`;
    row = created.rows[0];
  }
  if (!row) return { ok: false, reason: "not_invited" };
  if (row.status === "disabled") return { ok: false, reason: "disabled" };
  if (row.google_sub && row.google_sub !== input.sub) return { ok: false, reason: "mismatch" };
  if (!isOwner) {
    if (row.status === "pending") return { ok: false, reason: "not_invited" };
    if (row.status === "invited" && !(row.invite_expires_at && Date.parse(String(row.invite_expires_at)) > Date.now())) {
      return { ok: false, reason: "expired" };
    }
  }
  const firstOwnerSignIn = isOwner && !(await getSetting("passwords_retired_at"));
  const { rows: updated } = await sql`
    update venue_users set status = 'active', google_sub = ${input.sub}, last_sign_in_at = now(),
      invite_hash = null, invite_expires_at = null,
      roles = case when ${isOwner} and not ('admin' = any(roles)) then array_prepend('admin', roles) else roles end
    where id = ${row.id as string} returning *
  `;
  if (firstOwnerSignIn) await setSetting("passwords_retired_at", new Date().toISOString());
  return { ok: true, user: { ...toUser(updated[0]), sessionVersion: Number(updated[0].session_version) }, firstOwnerSignIn };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  await ensureSchema();
  const { rows } = await sql`select value from venue_settings where key = ${key}`;
  return (rows[0]?.value as string | undefined) ?? null;
}

export async function setSetting(key: string, value: string) {
  await ensureSchema();
  await sql`insert into venue_settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
}

/** Old shared passwords stop working once the Admin has signed in with Google. */
export async function passwordsRetired(): Promise<boolean> {
  if (!process.env.POSTGRES_URL) return false;
  try {
    return Boolean(await getSetting("passwords_retired_at"));
  } catch {
    return false;
  }
}

/** Everyone with the areas their roles grant (for owner pickers, recipients). */
export async function listUsersWithAreas(): Promise<(VenueUser & { areas: Set<AreaId> })[]> {
  const [users, roles] = await Promise.all([listUsers(), listRoles()]);
  return users.map((u) => ({
    ...u,
    areas: u.roles.includes(ADMIN_ROLE) ? new Set(AREA_IDS) : new Set(roles.filter((r) => u.roles.includes(r.id)).flatMap((r) => r.areas)),
  }));
}
