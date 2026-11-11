import { hasBlackbookSession } from "@/lib/blackbookAuth";
import { redirect } from "next/navigation";
import BlackbookLoginForm from "./BlackbookLoginForm";
import { getVenue } from "@/lib/venues";
type LoginPageProps = {
    params: Promise<{ venue: string }>;
    searchParams?: Promise<{
        error?: string;
    }>;
};
export const dynamic = "force-dynamic";
export default async function BlackbookLoginPage({ params, searchParams }: LoginPageProps) {
    const venue = getVenue((await params).venue);
    if (await hasBlackbookSession(venue))
        redirect(`${venue.basePath}/blackbook`);
    const query = await searchParams;
    return (<main className="admin-login-page">
      <div className="admin-login-logo" role="img" aria-label={venue.name}/>
      <section className="admin-login-card" aria-labelledby="blackbook-login-title">
        <h1 id="blackbook-login-title">Blackbook</h1>
        {query?.error ? <div className="admin-login-error">That password did not work.</div> : null}
        <BlackbookLoginForm />
      </section>
    </main>);
}
