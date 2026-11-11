"use client";

export default function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/admin/api/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      {label}
    </button>
  );
}
