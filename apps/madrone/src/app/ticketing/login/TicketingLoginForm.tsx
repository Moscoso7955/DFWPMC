"use client";
import { venuePath } from "@/lib/venue";
import { useState } from "react";
function EyeIcon({ isOpen = false }: {
    isOpen?: boolean;
}) {
    return (<svg viewBox="0 0 24 24" aria-hidden="true">
      {isOpen ? (<>
          <path d="M2.6 12s3.4-6 9.4-6 9.4 6 9.4 6-3.4 6-9.4 6-9.4-6-9.4-6Z"/>
          <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/>
        </>) : (<>
          <path d="M3.2 12s3.2-5.5 8.8-5.5 8.8 5.5 8.8 5.5"/>
          <path d="M5.4 15.6c1.5 1.2 3.7 2.4 6.6 2.4s5.1-1.2 6.6-2.4"/>
          <path d="M4.5 4.5 19.5 19.5"/>
        </>)}
    </svg>);
}
export default function TicketingLoginForm() {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const hasPassword = password.length > 0;
    return (<form action={venuePath("/ticketing/api/login")} method="post">
      <label>
        <span>Password</span>
        <span className="ticketing-password-field">
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/>
          {hasPassword ? (<button className="ticketing-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
              <EyeIcon isOpen={showPassword}/>
            </button>) : null}
        </span>
      </label>
      <button className="ticketing-login-submit" type="submit">
        Enter Portal
      </button>
    </form>);
}
