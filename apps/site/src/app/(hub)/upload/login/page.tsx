import { redirect } from "next/navigation";
import { getContributorSession } from "@/lib/contributorAuth";
import { passwordsRetired } from "@/lib/accessStore";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function UploadLoginPage({ searchParams }: Props) {
  if (await getContributorSession()) redirect("/upload");
  // Uploads sign in with Google once the old passwords are retired.
  if (await passwordsRetired()) redirect("/admin/login?next=/upload");
  const params = await searchParams;

  return (
    <main className="admin-login-page">
      <div className="admin-login-logo" role="img" aria-label="The Public Market" />
      <section className="admin-login-card" aria-labelledby="upload-login-title">
        <h1 id="upload-login-title">Contributor Upload</h1>
        {params?.error ? <div className="admin-login-error">That email and password didn&apos;t match.</div> : null}
        <form action="/upload/api/login" method="post">
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="admin-login-submit" type="submit">
            Log In
          </button>
        </form>
        <p className="upload-login-note">For photographers and contributors. Ask the Public Market for a login.</p>
      </section>
    </main>
  );
}
