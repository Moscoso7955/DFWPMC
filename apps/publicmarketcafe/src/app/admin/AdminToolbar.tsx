"use client";
import { collectiveLogoutUrl, venuePath } from "@/lib/venue";
export default function AdminToolbar() {
    const runAction = async (url: string) => {
        await fetch(venuePath(url), { method: "POST" });
        window.location.reload();
    };
    const logOut = async () => {
        await fetch(venuePath("/admin/api/logout"), { method: "POST" });
        // One sign-out for the collective: the hub clears its session and
        // every venue session, otherwise it would sign us straight back in.
        window.location.href = collectiveLogoutUrl();
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
