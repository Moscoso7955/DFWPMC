"use client";

import { venuePath } from "@/lib/venue";

export default function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch(venuePath("/admin/api/logout"), { method: "POST" });
        window.location.href = venuePath("/admin/login");
      }}
    >
      {label}
    </button>
  );
}
