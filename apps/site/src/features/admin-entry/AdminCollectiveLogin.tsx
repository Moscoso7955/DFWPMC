import AdminEntryLoginForm from "./AdminEntryLoginForm";
import styles from "./AdminEntry.module.css";

// The collective login screen: the Public Market seal and card from the
// approved selector. One gate for the whole collective: Google invite-only
// sign-in once it is switched on, with the single password form until the
// shared password is retired.
export default function AdminCollectiveLogin({
  loginError = false,
  showPassword = true,
  googleHref = null,
  message = null,
  next = "/admin",
}: {
  loginError?: boolean;
  showPassword?: boolean;
  googleHref?: string | null;
  message?: string | null;
  next?: string;
}) {
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
          {message ? (
            <p className={styles.status} role="alert">
              {message}
            </p>
          ) : null}
          {googleHref ? (
            <a className={styles.googleButton} href={googleHref}>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.4 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
                <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.8-6z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-3.9-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Sign in with Google
            </a>
          ) : null}
          {showPassword ? <AdminEntryLoginForm loginError={loginError} next={next} /> : null}
        </section>
      </div>
    </main>
  );
}
