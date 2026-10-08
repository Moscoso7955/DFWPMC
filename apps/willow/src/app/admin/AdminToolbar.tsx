"use client";
import { adminSelectorUrl, venuePath } from "@/lib/venue";
export default function AdminToolbar() {
    const runAction = async (url: string) => {
        await fetch(venuePath(url), { method: "POST" });
        window.location.reload();
    };
    const logOut = async () => {
        await fetch(venuePath("/admin/api/logout"), { method: "POST" });
        // Leaving a venue returns to the collective selector; the real
        // sign-out (ending the collective session) lives on that screen.
        window.location.href = adminSelectorUrl();
    };
    return (<div className="admin-toolbar" aria-label="Admin actions">
      <a href={venuePath("/admin/hours")}>Hours</a>
      <button type="button" onClick={() => runAction("/admin/api/publish")}>
        Publish Changes
      </button>
      <button type="button" onClick={() => runAction("/admin/api/discard")}>
        Discard Draft
      </button>
      <button type="button" onClick={logOut}>
        Log Out
      </button>
    </div>);
}
