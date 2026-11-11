"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLE, type Role, type VenueUser } from "@/lib/accessShared";
import SettingsNav from "./SettingsNav";

type Props = { users: VenueUser[]; roles: Role[]; venue: string; google: boolean; ownerSet: boolean; retired: boolean };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { error?: string; warning?: string };
  if (!res.ok) throw new Error(data.error || "That didn't work.");
  return data;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

function statusLine(u: VenueUser) {
  if (u.status === "disabled") return "Turned off";
  if (u.status === "active" && u.lastSignInAt) return `Signed in ${when(u.lastSignInAt)}`;
  if (u.status === "active") return "Active";
  if (u.status === "invited") {
    const expired = u.inviteExpiresAt && Date.parse(u.inviteExpiresAt) < Date.now();
    return expired ? `Invite expired ${when(u.inviteExpiresAt)}` : `Invited ${when(u.invitedAt)} · hasn't signed in`;
  }
  return u.email ? "Not invited yet" : "No email (can own tasks, can't sign in)";
}

export default function PeopleSettings({ users, roles, venue, google, ownerSet, retired }: Props) {
  const router = useRouter();
  const assignable = roles.filter((r) => r.id !== ADMIN_ROLE);
  const [draft, setDraft] = useState({ name: "", email: "", roles: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const run = async (fn: () => Promise<{ warning?: string } | unknown>, done?: string) => {
    setBusy(true);
    setMessage("");
    try {
      const r = (await fn()) as { warning?: string } | undefined;
      setMessage(r?.warning ?? done ?? "");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (u: VenueUser, roleId: string) => {
    const next = u.roles.includes(roleId) ? u.roles.filter((r) => r !== roleId) : [...u.roles, roleId];
    run(() => call("PATCH", `/admin/api/access/users/${u.id}`, { roles: next.filter((r) => r !== ADMIN_ROLE) }));
  };

  return (
    <section className="admin-mailing-list pb">
      <div className="admin-mailing-list-header">
        <h1>Settings</h1>
      </div>
      <SettingsNav active="people" />
      <p className="admin-mailing-list-note">
        Who can sign in to {venue}&apos;s admin, and as what. People sign in with Google using the email you invite. Turn
        someone off or remove them and they&apos;re signed out everywhere right away. Tick Update emails for anyone who should get
        the 8 AM email about new features; it greets each of them by name.
      </p>
      {!google ? (
        <p className="admin-photos-warning">
          Google sign-in isn&apos;t switched on yet (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel). You can add people and send
          invites now; the links work once it&apos;s on.
        </p>
      ) : null}
      {!ownerSet ? <p className="admin-photos-warning">Set ADMIN_EMAIL in Vercel to the venue Admin&apos;s Google email.</p> : null}
      {google && !retired ? (
        <p className="admin-photos-warning">
          The first time the Admin signs in with Google, every old password turns off: ticketing, door, Blackbook and the
          photographers&apos; upload logins. Invite everyone who still needs in (door staff and photographers too) before then.
        </p>
      ) : null}
      {message ? (
        <p className="admin-photos-warning" role="status">
          {message}
        </p>
      ) : null}

      <ul className="access-people">
        {users.map((u) => (
          <li key={u.id} className={u.status === "disabled" ? "is-off" : undefined}>
            <div className="access-person">
              <input
                defaultValue={u.name}
                aria-label="Name"
                onBlur={(e) => e.target.value.trim() && e.target.value !== u.name && run(() => call("PATCH", `/admin/api/access/users/${u.id}`, { name: e.target.value }))}
              />
              <input
                defaultValue={u.email}
                type="email"
                placeholder="Google email"
                aria-label="Email"
                disabled={u.isOwner}
                onBlur={(e) => e.target.value !== u.email && run(() => call("PATCH", `/admin/api/access/users/${u.id}`, { email: e.target.value }))}
              />
            </div>
            <div className="access-chips">
              {u.isOwner ? <span className="access-chip is-on">✓ Admin</span> : null}
              {assignable.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`access-chip${u.roles.includes(r.id) ? " is-on" : ""}`}
                  aria-pressed={u.roles.includes(r.id)}
                  onClick={() => toggleRole(u, r.id)}
                  disabled={busy}
                >
                  {u.roles.includes(r.id) ? "✓ " : ""}
                  {r.name}
                </button>
              ))}
            </div>
            <div className="access-person-status">
            <em>{u.isOwner ? (u.lastSignInAt ? `You · signed in ${when(u.lastSignInAt)}` : "You · the venue's Admin") : statusLine(u)}</em>
            <label className="access-updates" title="The morning email about new features on the site">
              <input
                type="checkbox"
                checked={u.updateEmails}
                disabled={busy || u.status === "disabled"}
                onChange={(e) => run(() => call("PATCH", `/admin/api/access/users/${u.id}`, { updateEmails: e.target.checked }))}
              />
              <span>Update emails</span>
            </label>
            </div>
            <div className="access-person-actions">
              {!u.isOwner && u.email && u.status !== "disabled" && u.status !== "active" ? (
                <button type="button" onClick={() => run(() => call("POST", `/admin/api/access/users/${u.id}`, { action: "invite" }), `Invite sent to ${u.email}.`)} disabled={busy}>
                  {u.status === "invited" ? "Resend invite" : "Send invite"}
                </button>
              ) : null}
              {!u.isOwner && u.status === "invited" ? (
                <button type="button" className="is-quiet" onClick={() => run(() => call("POST", `/admin/api/access/users/${u.id}`, { action: "cancel" }))} disabled={busy}>
                  Cancel invite
                </button>
              ) : null}
              {!u.isOwner ? (
                <button
                  type="button"
                  className="is-quiet"
                  onClick={() => run(() => call("POST", `/admin/api/access/users/${u.id}`, { action: u.status === "disabled" ? "enable" : "disable" }))}
                  disabled={busy}
                >
                  {u.status === "disabled" ? "Turn on" : "Turn off"}
                </button>
              ) : null}
              {!u.isOwner ? (
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => window.confirm(`Remove ${u.name}? They're signed out, and their Playbook tasks keep their name.`) && run(() => call("DELETE", `/admin/api/access/users/${u.id}`))}
                  disabled={busy}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="access-invite"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await call("POST", "/admin/api/access/users", draft);
            setDraft({ name: "", email: "", roles: draft.roles });
            return r;
          }, draft.email ? `Invite sent to ${draft.email}.` : "Added.");
        }}
      >
        <strong>Invite someone</strong>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" required />
        <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Google email" type="email" />
        <div className="access-chips">
          {assignable.map((r) => {
            const on = draft.roles.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={`access-chip${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() => setDraft({ ...draft, roles: on ? draft.roles.filter((x) => x !== r.id) : [...draft.roles, r.id] })}
              >
                {on ? "✓ " : ""}
                {r.name}
              </button>
            );
          })}
        </div>
        <button type="submit" disabled={busy || !draft.name.trim()}>
          {draft.email ? "Send invite" : "Add (no sign-in)"}
        </button>
        <p className="admin-pe-hint">
          They get an email with a link to sign in with Google, using the Google account for that email. Leave the email off for someone
          who only owns Playbook tasks.
        </p>
      </form>
    </section>
  );
}
