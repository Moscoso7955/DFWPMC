import type { ReactNode } from "react";
import AdminBar from "@/app/components/AdminBar";
import AdminModalKeys from "@/app/components/AdminModalKeys";
import AdminTips from "@/app/components/AdminTips";
import SaveNote from "@/app/components/SaveNote";
import { formatVersionLabel, getAppVersion } from "@/lib/appVersion";
import { getPrincipal } from "@/lib/session";

/**
 * The collective's admin pages (Photos, Playbook, Contacts, Analytics,
 * People & access): plain tool screens under the one admin bar.
 */
export default async function CollectiveShell({ children }: { children: ReactNode; layout?: "pages" | "tool"; title?: string }) {
  const principal = await getPrincipal();
  const areas = principal ? [...principal.areas] : [];
  const who = principal?.kind === "user" ? principal.user.name : null;
  return (
    <div className="admin-shell admin-shell--tool">
      <AdminBar areas={areas} who={who} version={formatVersionLabel(getAppVersion())} editing={false} unpublished={false} />
      <AdminModalKeys />
      <AdminTips />
      <SaveNote />
      {children}
    </div>
  );
}
