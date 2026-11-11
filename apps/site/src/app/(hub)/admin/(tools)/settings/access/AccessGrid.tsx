"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLE, AREAS, type AreaId, type Role } from "@/lib/accessShared";
import SettingsNav from "../SettingsNav";

export default function AccessGrid({ roles: initial }: { roles: Role[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const toggle = async (role: Role, area: AreaId) => {
    if (role.id === ADMIN_ROLE) return;
    const on = !role.areas.includes(area);
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, areas: on ? [...r.areas, area] : r.areas.filter((a) => a !== area) } : r)));
    const res = await fetch(`/admin/api/access/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area, on }),
    });
    if (!res.ok) {
      setError("That didn't save. Reload and try again.");
      router.refresh();
    }
  };

  return (
    <section className="admin-mailing-list pb">
      <div className="admin-mailing-list-header">
        <h1>Settings</h1>
      </div>
      <SettingsNav active="access" />
      <p className="admin-mailing-list-note">
        Tick what each role can see and use. Someone with several roles gets everything any of them allows. Admin always has
        everything, so you can&apos;t lock yourself out.
      </p>
      {error ? (
        <p className="admin-photos-warning" role="alert">
          {error}
        </p>
      ) : null}
      <div className="access-grid-wrap">
        <table className="access-grid">
          <thead>
            <tr>
              <th />
              {roles.map((r) => (
                <th key={r.id} scope="col">
                  {r.name}
                  {!r.builtin ? (
                    <button
                      type="button"
                      className="access-role-remove"
                      aria-label={`Delete role ${r.name}`}
                      onClick={async () => {
                        if (!window.confirm(`Delete the ${r.name} role? People lose what it gave them.`)) return;
                        await fetch(`/admin/api/access/roles/${r.id}`, { method: "DELETE" });
                        setRoles((rs) => rs.filter((x) => x.id !== r.id));
                        router.refresh();
                      }}
                    >
                      ✕
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((area) => (
              <tr key={area.id}>
                <th scope="row">
                  <strong>{area.label}</strong>
                  <em>{area.hint}</em>
                </th>
                {roles.map((r) => {
                  const on = r.areas.includes(area.id);
                  const locked = r.id === ADMIN_ROLE;
                  return (
                    <td key={r.id}>
                      <button
                        type="button"
                        className={`access-tick${on ? " is-on" : ""}${locked ? " is-locked" : ""}`}
                        aria-pressed={on}
                        aria-label={`${r.name}: ${area.label}`}
                        disabled={locked}
                        onClick={() => toggle(r, area.id)}
                      >
                        {on ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="pb-inline-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const res = await fetch("/admin/api/access/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
          if (res.ok) {
            setName("");
            router.refresh();
            window.location.reload();
          } else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add it.");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder='New role, e.g. "Bar lead"' />
        <button type="submit">+ Add a role</button>
      </form>
    </section>
  );
}
