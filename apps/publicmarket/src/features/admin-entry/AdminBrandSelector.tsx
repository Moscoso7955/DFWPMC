import Link from "next/link";
import { brands } from "@/brands";
import styles from "./AdminEntry.module.css";

// The approved selector screen. With the single collective login, choosing
// a brand goes straight into that venue's portal (/admin/enter/<slug> mints
// the venue session) — no second password.
export default function AdminBrandSelector({ overview }: { overview?: React.ReactNode }) {
  return (
    <main className={overview ? `${styles.page} ${styles.pageColumn}` : styles.page}>
      <div className={`${styles.stack} ${styles.selectorStack}`}>
        <img
          className={styles.marketLogo}
          src="/assets/brand/pm-seal-bone.svg"
          alt="The Public Market, Fort Worth, Texas"
          width={120}
          height={120}
        />
        <section className={styles.card} aria-labelledby="admin-portal-title">
          <h1 className={`${styles.title} ${styles.selectorTitle}`} id="admin-portal-title">
            Admin Portal
          </h1>
          <nav className={styles.brandList} aria-label="Choose an admin portal">
            {brands.map((brand) => (
              <Link
                className={`${styles.brandCard} ${styles[brand.slug]}`}
                href={`/admin/enter/${brand.slug}`}
                prefetch={false}
                aria-label={brand.name}
                key={brand.slug}
              >
                <img src={brand.logo} alt="" />
                <span className="sr-only">{brand.name}</span>
              </Link>
            ))}
          </nav>
        </section>
      </div>
      {overview ? <div className={styles.overviewWrap}>{overview}</div> : null}
    </main>
  );
}
