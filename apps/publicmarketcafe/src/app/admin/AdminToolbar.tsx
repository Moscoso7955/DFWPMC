"use client";
import { adminSelectorUrl, venuePath } from "@/lib/venue";
import { useEffect, useState } from "react";
export default function AdminToolbar({ unpublished: initial = false }: { unpublished?: boolean }) {
    const [unpublished, setUnpublished] = useState(initial);
    // Most edits save without a page load, so re-check now and then.
    useEffect(() => {
        let stopped = false;
        const check = async () => {
            if (document.visibilityState !== "visible") return;
            try {
                const res = await fetch(venuePath("/admin/api/publish-status"), { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as { unpublished?: boolean };
                if (!stopped) setUnpublished(Boolean(data.unpublished));
            } catch {}
        };
        const timer = window.setInterval(check, 6000);
        window.addEventListener("focus", check);
        return () => {
            stopped = true;
            window.clearInterval(timer);
            window.removeEventListener("focus", check);
        };
    }, []);
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
      {unpublished ? (<span className="admin-toolbar-unpublished" role="status">
          Unpublished changes
        </span>) : null}
      <a href={venuePath("/admin/hours")}>Hours</a>
      <button type="button" className={unpublished ? "admin-toolbar-publish--pending" : undefined} onClick={() => runAction("/admin/api/publish")}>
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
