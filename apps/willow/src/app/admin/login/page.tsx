import { redirect } from "next/navigation";
import { adminEntryUrl, venue, venuePath } from "@/lib/venue";
import { safeAdminNext } from "@/lib/adminAuth";
import { isGoogleConfigured } from "@/lib/googleAuth";
import { passwordsRetired } from "@/lib/accessStore";
import { getPrincipal, homeFor } from "@/lib/session";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string; email?: string }>;
};

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, (email: string) => string> = {
  retired: () => "The shared password has been retired. Sign in with Google.",
  not_invited: (email) => `${email || "That account"} isn't on the list yet. Ask the venue's Admin to invite you.`,
  expired: () => "Your invite has expired. Ask for a new one.",
  invite: () => "That invite link has expired or was replaced by a newer one.",
  disabled: () => "Your access has been turned off.",
  mismatch: () => "That Google account doesn't match the one on file for this email.",
  wrong_account: (email) => `This invite is for a different email${email ? ` (you signed in as ${email})` : ""}. Sign in with the Google account for the email you were invited at.`,
  google: () => "Google sign-in didn't work. Try again.",
  cancelled: () => "Sign-in was cancelled.",
  google_off: () => "Google sign-in isn't switched on yet.",
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeAdminNext(params?.next);
  const principal = await getPrincipal();
  if (principal) redirect(params?.next ? next : ((await homeFor(principal)) ?? "/admin/no-access"));

  const google = isGoogleConfigured();
  // Without Google, the approved collective login on the hub stays the
  // only way in, exactly as before.
  if (!google) redirect(adminEntryUrl(params?.error ? "password" : undefined));
  const showPassword = !(await passwordsRetired());
  const message = params?.error ? (MESSAGES[params.error] ?? MESSAGES.google)(params.email ?? "") : null;

  return (
    <main className="admin-login-page">
      <div className="admin-login-logo" role="img" aria-label={venue.name} />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">Sign in</h1>
        {message ? <div className="admin-login-error">{message}</div> : null}
        <p className="access-signin-note">{venue.name} staff only. Use the Google account you were invited with.</p>
        <a className="access-google" href={`${venuePath("/auth/google/start")}?next=${encodeURIComponent(next)}`}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.4 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
            <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.8-6z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.7-3.9-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
          </svg>
          Sign in with Google
        </a>
        <p className="access-signin-fine">Not on the list? Ask the venue&apos;s Admin to invite your email.</p>
        {showPassword ? (
          <p className="access-signin-fine">
            <a href={adminEntryUrl()}>Use the collective password instead</a>
          </p>
        ) : null}
      </section>
    </main>
  );
}
