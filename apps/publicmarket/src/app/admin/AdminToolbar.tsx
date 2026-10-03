"use client";

export default function AdminToolbar() {
  const runAction = async (url: string) => {
    await fetch(url, { method: "POST" });
    window.location.reload();
  };

  const logOut = async () => {
    await fetch("/admin/api/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="admin-toolbar" aria-label="Admin actions">
      <button type="button" onClick={() => runAction("/admin/api/publish")}>
        Publish Changes
      </button>
      <button type="button" onClick={() => runAction("/admin/api/discard")}>
        Discard Draft
      </button>
      <button type="button" onClick={logOut}>
        Log Out
      </button>
    </div>
  );
}
