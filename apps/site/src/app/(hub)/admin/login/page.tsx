import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminCollectiveLogin from "@/features/admin-entry/AdminCollectiveLogin";
import { safeAdminNext } from "@/lib/adminAuth";
import { isGoogleConfigured } from "@/lib/googleAuth";
import { passwordsRetired } from "@/lib/accessStore";
import { getPrincipal, homeFor } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin Login — The Public Market",
};

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, (email: string) => string> = {
  retired: () => "The shared password has been retired. Sign in with Google.",
  not_invited: (email) => `${email || "That account"} isn't on the list yet. Ask the Admin to invite you.`,
  expired: () => "Your invite has expired. Ask for a new one.",
  invite: () => "That invite link has expired or was replaced by a newer one.",
  disabled: () => "Your access has been turned off.",
  mismatch: () => "That Google account doesn't match the one on file for this email.",
  wrong_account: (email) => `This invite is for a different email${email ? ` (you signed in as ${email})` : ""}. Sign in with the Google account for the email you were invited at.`,
  google: () => "Google sign-in didn't work. Try again.",
  cancelled: () => "Sign-in was cancelled.",
  google_off: () => "Google sign-in isn't switched on yet.",
};

export default async function CollectiveLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}) {
  const params = await searchParams;
  const next = safeAdminNext(params?.next);
  const principal = await getPrincipal();
  if (principal) redirect(params?.next ? next : ((await homeFor(principal)) ?? "/admin/no-access"));

  const google = isGoogleConfigured();
  const showPassword = !google || !(await passwordsRetired());
  const passwordError = params?.error === "1";
  const message =
    params?.error && !passwordError ? (MESSAGES[params.error] ?? MESSAGES.google)(params.email ?? "") : null;

  return (
    <AdminCollectiveLogin
      loginError={passwordError}
      showPassword={showPassword}
      googleHref={google ? `/auth/google/start?next=${encodeURIComponent(next)}` : null}
      message={message}
      next={next}
    />
  );
}
