import { venuePath } from "@/lib/venue";
import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { redirect } from "next/navigation";
import BlackbookLoginForm from "./BlackbookLoginForm";
type LoginPageProps = {
    searchParams?: Promise<{
        error?: string;
    }>;
};
export const dynamic = "force-dynamic";
export default async function BlackbookLoginPage({ searchParams }: LoginPageProps) {
    if (await hasBlackbookSession())
        redirect("/blackbook");
    const params = await searchParams;
    return (<main className="admin-login-page">
      <div className="admin-login-logo" role="img" aria-label="Willow"/>
      <section className="admin-login-card" aria-labelledby="blackbook-login-title">
        <h1 id="blackbook-login-title">Blackbook</h1>
        {params?.error ? <div className="admin-login-error">That password did not work.</div> : null}
        <BlackbookLoginForm />
      </section>
    </main>);
}
