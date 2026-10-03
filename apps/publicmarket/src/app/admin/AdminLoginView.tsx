import type { ReactNode } from "react";

type AdminLoginViewProps = {
  children: ReactNode;
  errorMessage?: string;
};

export default function AdminLoginView({ children, errorMessage }: AdminLoginViewProps) {
  return (
    <main className="admin-login-page">
      <img
        className="admin-login-logo"
        src="/assets/brand/pm-seal-bone.svg"
        alt="The Public Market, Fort Worth, Texas"
      />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">Admin Login</h1>
        {errorMessage ? <div className="admin-login-error">{errorMessage}</div> : null}
        {children}
      </section>
    </main>
  );
}
