"use client";

import { useState, type FormEvent } from "react";
import styles from "./AdminEntry.module.css";

export default function AdminEntryLoginForm({ brandName, loginAction, loginError = false }: { brandName: string; loginAction?: string; loginError?: boolean }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (loginAction) return;
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form className={styles.form} action={loginAction} method={loginAction ? "post" : undefined} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="admin-brand-password">
        <span>Password</span>
        <span className={styles.passwordField}>
          <input
            className={styles.input}
            id="admin-brand-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
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
      {loginError || submitted ? (
        <p className={styles.status} role={loginError ? "alert" : "status"}>
          {loginError ? "That password did not work. Please try again." : `The ${brandName} admin portal is coming soon.`}
        </p>
      ) : null}
    </form>
  );
}
