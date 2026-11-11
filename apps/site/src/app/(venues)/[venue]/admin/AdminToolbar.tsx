"use client";
import { useVenue } from "@/app/components/VenueProvider";
import { useEffect, useState } from "react";
export default function AdminToolbar({ unpublished: initial = false }: { unpublished?: boolean }) {
    const { venuePath } = useVenue();
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
        await fetch("/admin/api/logout", { method: "POST" });
        window.location.href = "/admin/login";
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
