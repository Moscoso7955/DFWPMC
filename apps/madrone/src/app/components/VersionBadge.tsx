import { venue } from "@/lib/venue";
import { formatVersionLabel, getAppVersion } from "@/lib/appVersion";

type Props = {
  variant?: "dark" | "light";
};

// Renders a small badge in the corner of authenticated shells with the
// short commit sha and environment. Server-only — no client bundle
// impact.

export default function VersionBadge({ variant = "dark" }: Props) {
  const version = getAppVersion();
  const label = formatVersionLabel(version);
  return (
    <div className={`version-badge version-badge--${variant}`} title={version.ref ?? ""} aria-label={`Build ${label}`}>
      <span>{venue.name} · {process.env.VERCEL ? "CMS" : "Local preview"}</span>
    </div>
  );
}
