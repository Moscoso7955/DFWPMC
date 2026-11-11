import { getPrincipal } from "@/lib/session";
import SignOutButton from "../SignOutButton";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const principal = await getPrincipal();
  return (
    <main className="admin-login-page">
      <div className="admin-login-logo" role="img" aria-label="" />
      <section className="admin-login-card">
        <h1>Nothing here yet</h1>
        <p className="access-signin-note">
          {principal?.kind === "user" ? `You're signed in as ${principal.user.email}, ` : "You're signed in, "}
          but your role doesn&apos;t include any part of admin yet. Ask the venue&apos;s Admin to give you access.
        </p>
        <div className="access-signout">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
