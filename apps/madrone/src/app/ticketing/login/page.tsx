import { venue, venuePath } from "@/lib/venue";
import { getTicketingRole } from "@/lib/ticketingAuth";
import { redirect } from "next/navigation";
import TicketingLoginForm from "./TicketingLoginForm";
type LoginPageProps = {
    searchParams?: Promise<{
        error?: string;
    }>;
};
export const dynamic = "force-dynamic";
export default async function TicketingLoginPage({ searchParams }: LoginPageProps) {
    const role = await getTicketingRole();
    if (role === "manager")
        redirect("/ticketing");
    if (role === "door")
        redirect("/ticketing/door");
    const params = await searchParams;
    return (<main className="ticketing-login">
      <section className="ticketing-login-card" aria-labelledby="ticketing-login-title">
        <img className="ticketing-login-logo" src={venuePath(venue.logo)} alt={venue.name} />
        <p className="ticketing-login-kicker">Madrone</p>
        <h1 id="ticketing-login-title">Ticketing Portal</h1>
        {params?.error ? <div className="ticketing-login-error">That password did not work.</div> : null}
        <TicketingLoginForm />
        <p className="ticketing-login-fineprint">
          Events managers get full access. Door staff get scan-only access.
        </p>
      </section>
    </main>);
}
