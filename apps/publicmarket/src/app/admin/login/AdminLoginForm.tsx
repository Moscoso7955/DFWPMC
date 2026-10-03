"use client";

import { useState } from "react";

function EyeIcon({ isOpen = false }: { isOpen?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {isOpen ? (
        <>
          <path d="M2.6 12s3.4-6 9.4-6 9.4 6 9.4 6-3.4 6-9.4 6-9.4-6-9.4-6Z" />
          <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        </>
      ) : (
        <>
          <path d="M3.2 12s3.2-5.5 8.8-5.5 8.8 5.5 8.8 5.5" />
          <path d="M5.4 15.6c1.5 1.2 3.7 2.4 6.6 2.4s5.1-1.2 6.6-2.4" />
          <path d="M4.5 4.5 19.5 19.5" />
        </>
      )}
    </svg>
  );
}

export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hasPassword = password.length > 0;

  return (
    <form action="/admin/api/login" method="post">
      <label>
        <span>Password</span>
        <span className="admin-password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {hasPassword ? (
            <button
              className="admin-password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <EyeIcon isOpen={showPassword} />
            </button>
          ) : null}
        </span>
      </label>
      <button className="admin-login-submit" type="submit">
        Enter Admin Portal
      </button>
    </form>
  );
}
