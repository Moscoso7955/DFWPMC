
export default function SettingsNav({ active }: { active: "people" | "access" }) {
  return (
    <nav className="pb-tabs" aria-label="Settings">
      <a className={active === "people" ? "is-active" : undefined} href={"/admin/settings"}>
        People
      </a>
      <a className={active === "access" ? "is-active" : undefined} href={"/admin/settings/access"}>
        Roles &amp; access
      </a>
    </nav>
  );
}
