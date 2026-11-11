import Link from "next/link";
import type { ReactNode } from "react";
import SignOutButton from "../SignOutButton";

export default function CollectiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell admin-shell--venue-pages">
      <header className="venue-admin-header" aria-label="The Public Market settings">
        <Link className="venue-admin-brand" href="/admin">
          <img src="/assets/brand/pm-seal-green.svg" alt="The Public Market" />
          <span><strong>The Public Market</strong><small>People &amp; access</small></span>
        </Link>
        <nav className="venue-admin-nav" aria-label="Settings navigation">
          <Link href="/admin">Admin Portal</Link>
        </nav>
        <div className="admin-toolbar" aria-label="Session">
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
