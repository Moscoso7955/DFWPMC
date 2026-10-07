import { redirect } from "next/navigation";
import { hasCollectiveSession } from "@/lib/collective/auth";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "That password is incorrect.",
  config: "The admin password is not configured for this deployment.",
  expired: "Your session ended. Please sign in again.",
};

export default async function CollectiveLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasCollectiveSession()) redirect("/admin");
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid : null;

  return (
    <div className="fwa-login">
      <div className="fwa-login-box">
        <h1>The Public Market</h1>
        <p className="fwa-login-sub">Collective admin</p>
        {message ? <p className="fwa-notice fwa-notice--error">{message}</p> : null}
        <form method="post" action="/admin/api/login">
          <label className="fwa-field-label" htmlFor="password">
            Password
          </label>
          <input
            className="fwa-input"
            style={{ marginTop: 8 }}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
          <button className="fwa-btn" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
