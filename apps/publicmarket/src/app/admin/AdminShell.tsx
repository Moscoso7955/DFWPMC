import Link from "next/link";
import type { ReactNode } from "react";
import AdminToolbar from "./AdminToolbar";

type AdminShellProps = {
  children: ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <Link className="admin-portal-nav" href="/admin/analytics">
        Analytics
      </Link>
      <div className="admin-portal-title" aria-label="Admin Portal">
        ADMIN PORTAL
      </div>
      <AdminToolbar />
      {children}
    </div>
  );
}
