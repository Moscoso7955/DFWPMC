"use client";

import { useState } from "react";
import styles from "./AdminEntry.module.css";

// The approved login form, now submitting the single collective password.
// The optional hidden `venue` field tells the login API which venue portal
// to open after sign-in.
export default function AdminEntryLoginForm({
  venue,
  loginError = false,
}: {
  venue?: string;
  loginError?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className={styles.form} action="/admin/api/login" method="post">
      {venue ? <input type="hidden" name="venue" value={venue} /> : null}
      <label className={styles.label} htmlFor="admin-brand-password">
        <span>Password</span>
        <span className={styles.passwordField}>
          <input
            className={styles.input}
            id="admin-brand-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {password.length > 0 ? (
            <button
              className={styles.passwordToggle}
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.6 12s3.4-6 9.4-6 9.4 6 9.4 6-3.4 6-9.4 6-9.4-6-9.4-6Z" />
                <circle cx="12" cy="12" r="3.2" />
                {showPassword ? null : <path d="M4.5 4.5 19.5 19.5" />}
              </svg>
            </button>
          ) : null}
        </span>
      </label>
      <button className={styles.submit} type="submit">
        <span>Enter Admin Portal</span>
      </button>
      {loginError ? (
        <p className={styles.status} role="alert">
          That password did not work. Please try again.
        </p>
      ) : null}
    </form>
  );
}
