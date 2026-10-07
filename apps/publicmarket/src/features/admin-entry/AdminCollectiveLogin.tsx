import AdminEntryLoginForm from "./AdminEntryLoginForm";
import styles from "./AdminEntry.module.css";

// The collective login screen: the Public Market seal and card from the
// approved selector, with the single password form. Signing in leads to
// the brand selector.
export default function AdminCollectiveLogin({ loginError = false }: { loginError?: boolean }) {
  return (
    <main className={styles.page}>
      <div className={`${styles.stack} ${styles.selectorStack}`}>
        <img
          className={styles.marketLogo}
          src="/assets/brand/pm-seal-bone.svg"
          alt="The Public Market, Fort Worth, Texas"
          width={120}
          height={120}
        />
        <section className={styles.card} aria-labelledby="admin-login-title">
          <h1 className={styles.title} id="admin-login-title">
            Admin Login
          </h1>
          <AdminEntryLoginForm loginError={loginError} />
        </section>
      </div>
    </main>
  );
}
