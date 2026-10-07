import Link from "next/link";
import type { BrandConfig } from "@/brands";
import { brandFonts } from "./brandFonts";
import AdminEntryLoginForm from "./AdminEntryLoginForm";
import styles from "./AdminEntry.module.css";

// The approved brand-styled login screen. It now takes the single
// collective password; on success the login API also signs this venue's
// session and opens its portal directly.
export default function AdminBrandLogin({ brand, loginError = false }: { brand: BrandConfig; loginError?: boolean }) {
  return (
    <main className={`${styles.page} ${styles.loginPage} ${styles[brand.slug]} ${brandFonts[brand.slug]}`}>
      <Link className={styles.backLink} href="/admin">
        <span aria-hidden="true">←</span>
        Choose a brand
      </Link>
      <div className={styles.stack}>
        <div className={styles.loginLogoSlot}>
          <img className={styles.loginLogo} src={brand.logo} alt={brand.name} />
        </div>
        <section className={styles.card} aria-labelledby="admin-login-title">
          <h1 className={styles.title} id="admin-login-title">Admin Login</h1>
          <AdminEntryLoginForm venue={brand.slug} loginError={loginError} />
        </section>
      </div>
    </main>
  );
}
