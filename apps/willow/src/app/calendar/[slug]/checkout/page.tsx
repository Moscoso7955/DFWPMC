import { venue, venuePath } from "@/lib/venue";
import Link from "next/link";
import { previewOrder } from "@/lib/previewData";
import PreviewNotice from "@/app/components/PreviewNotice";
import { redirect } from "next/navigation";
import HolderPage from "@/app/components/HolderPage";
import { getOrderById, getPublishedEventBySlug } from "@/lib/ticketingStore";
import { getStripe } from "@/lib/stripe";
import StripeEmbeddedCheckout from "./EmbeddedCheckout";
export const dynamic = "force-dynamic";
type PageProps = {
    params: Promise<{
        slug: string;
    }>;
    searchParams?: Promise<{
        order?: string;
    }>;
};
function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}
function formatTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
export default async function EmbeddedCheckoutPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const query = searchParams ? await searchParams : {};
    const orderId = typeof query.order === "string" ? query.order : "";
    const event = await getPublishedEventBySlug(slug);
    if (!event)
        redirect(`/calendar/${slug}`);
    // Missing order → back to the event page. Prevents someone dropping
    // into this URL without a reservation and staring at an empty
    // Stripe frame.
    if (!orderId)
        redirect(`/calendar/${event.slug}?cancelled=1`);
    const order = await getOrderById(orderId);
    if (!order || order.eventId !== event.id) {
        redirect(`/calendar/${event.slug}?cancelled=1`);
    }
    // Once a hold expires (or the order was already paid/refunded/etc.)
    // there's nothing to check out. Kick back to the event and let the
    // banner explain what happened.
    const holdExpired = order.holdExpiresAt && new Date(order.holdExpiresAt).getTime() < Date.now();
    if (order.status !== "pending" || holdExpired) {
        if (order.status === "paid") {
            redirect(`/calendar/${event.slug}/confirmation?order=${order.id}`);
        }
        redirect(`/calendar/${event.slug}?cancelled=1`);
    }
    let clientSecret = "";
    if (!venue.localPreview) {
        if (!order.stripeCheckoutSessionId) {
            redirect(`/calendar/${event.slug}?cancelled=1`);
        }
        // Retrieve the client_secret Stripe issued when the session was
        // created. Storing it locally would be another surface area to
        // secure; Stripe treats the session id + secret pair as the source
        // of truth, so we just re-read it on each page render.
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
        clientSecret = session.client_secret ?? "";
        if (!clientSecret) {
            redirect(`/calendar/${event.slug}?cancelled=1`);
        }
    }
    return (<HolderPage label="checkout" pageClassName="page--embedded-checkout">
      <article className="embedded-checkout-page">
        <header className="embedded-checkout-header">
          <p className="embedded-checkout-kicker">Checkout</p>
          <h1>{event.title}</h1>
          <p className="embedded-checkout-when">
            {formatDate(event.startsAt)} · Starts {formatTime(event.startsAt)}
          </p>
          <p className="embedded-checkout-total">
            Total <strong>${(order.totalCents / 100).toFixed(2)}</strong>
          </p>
        </header>

        {venue.localPreview ? <div className="local-checkout-placeholder"><PreviewNotice /><h2>Stripe checkout</h2><p>Payment is not connected yet.</p><Link href={`/calendar/${event.slug}/confirmation?order=${previewOrder.id}`}>View sample confirmation →</Link></div> : <StripeEmbeddedCheckout clientSecret={clientSecret}/>}

        <footer className="embedded-checkout-fineprint">
          <p>
            Add your approved payment and ticketing terms here. Review the editable <a href={venuePath("/terms")}>Terms</a> and{" "}
            <a href={venuePath("/privacy")}>Privacy Policy</a>.
          </p>
        </footer>
      </article>
    </HolderPage>);
}
