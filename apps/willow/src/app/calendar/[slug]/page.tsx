import { venuePath } from "@/lib/venue";
import HolderPage from "@/app/components/HolderPage";
import ShareEventButton from "@/app/components/ShareEventButton";
import TicketDrawerLauncher from "@/app/components/TicketDrawerLauncher";
import { getPublicTiersForEvent, getPublishedEventBySlug, getTicketingSettings, } from "@/lib/ticketingStore";
import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { availabilityLabel, getAvailability } from "@/lib/ticketAvailability";
import { resolveSongPreview } from "@/lib/songPreview";
export const dynamic = "force-dynamic";
// Shared by generateMetadata and the page so the event loads once.
const loadEvent = cache(getPublishedEventBySlug);
type PageProps = {
    params: Promise<{
        slug: string;
    }>;
    searchParams?: Promise<{
        cancelled?: string;
    }>;
};
const AGE_LABEL: Record<string, string> = {
    "21+": "21 and over",
    "18+": "18 and over",
    all_ages: "All ages",
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
// Per-event link previews (iMessage, Instagram DMs, Slack, etc.): the
// flyer as the image, the event name as the title, and the date/time
// as the description. Events without a flyer keep the site image.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const event = await loadEvent(slug);
    if (!event)
        return {};
    const when = new Date(event.startsAt).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
    const age = event.ageRestriction === "all_ages" ? "All ages" : event.ageRestriction;
    const description = `${when} at Willow · ${age}. Get tickets.`;
    // Always a 1080×1350 (4:5) image so the preview is the flyer shape.
    // ?v= changes when the flyer does, so apps don't show a stale one.
    const images = [
        event.imageUrl
            ? {
                url: `/calendar/${event.slug}/preview.jpg?v=${createHash("sha1").update(event.imageUrl).digest("hex").slice(0, 10)}`,
                width: 1080,
                height: 1350,
                alt: `${event.title} flyer`,
            }
            : { url: "/og-event-default.jpg", width: 1080, height: 1350, alt: "Willow" },
    ];
    const song = event.songUrl ? await resolveSongPreview(event.songUrl) : null;
    return {
        title: `${event.title} — Willow`,
        description,
        alternates: { canonical: `/calendar/${event.slug}` },
        openGraph: {
            type: "website",
            siteName: "Willow",
            url: `/calendar/${event.slug}`,
            title: event.title,
            description,
            images,
            // The event's Spotify song as a 30s clip, so iMessage can play it
            // in the link preview.
            ...(song ? { audio: [{ url: song.previewUrl, secureUrl: song.previewUrl, type: song.previewType }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: event.title,
            description,
            images: images.map((image) => image.url),
        },
    };
}
export default async function TicketedEventPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const query = searchParams ? await searchParams : {};
    const event = await loadEvent(slug);
    if (!event)
        notFound();
    const [tiers, settings] = await Promise.all([
        getPublicTiersForEvent(event.id),
        getTicketingSettings(),
    ]);
    const availability = getAvailability(tiers);
    const anyOnSale = availability.state === "on_sale";
    const statusLabel = availabilityLabel(availability);
    return (<HolderPage label="ticketed event" pageClassName="page--ticketed-event">
      <article className="ticketed-event">
        {event.imageUrl ? (<div className="ticketed-event-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={venuePath(event.imageUrl)} alt=""/>
          </div>) : (<div className="ticketed-event-hero ticketed-event-hero--empty" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={venuePath("/assets/brand/venue-logo.svg")} alt="Willow"/>
          </div>)}

        <header className="ticketed-event-header">
          <p className="ticketed-event-kicker">{formatDate(event.startsAt)}</p>
          <h1>{event.title}</h1>
          <p className="ticketed-event-time">
            {event.doorsAt ? <>Doors {formatTime(event.doorsAt)} · </> : null}
            Starts {formatTime(event.startsAt)}
            {event.endsAt ? <> · Ends {formatTime(event.endsAt)}</> : null}
          </p>
          <div className="ticketed-event-badges">
            <span className={`ticketed-event-badge ticketed-event-badge--${event.ageRestriction.replace("+", "-plus")}`}>
              {AGE_LABEL[event.ageRestriction] ?? event.ageRestriction}
            </span>
            <span className="ticketed-event-badge ticketed-event-badge--price">{statusLabel}</span>
            <ShareEventButton path={`/calendar/${event.slug}`} title={event.title} text={`${event.title} at Willow — ${formatDate(event.startsAt)}`}/>
          </div>
        </header>

        {query.cancelled ? (<div className="ticketed-event-note" role="status">
            Checkout cancelled — your hold has been released. Try again below when you&apos;re ready.
          </div>) : null}

        {event.descriptionMd ? (<div className="ticketed-event-copy">
            {event.descriptionMd.split(/\n{2,}/).map((paragraph, idx) => (<p key={idx}>{paragraph}</p>))}
          </div>) : null}

        <TicketDrawerLauncher event={{
            id: event.id,
            slug: event.slug,
            title: event.title,
            ageRestriction: event.ageRestriction,
        }} tiers={tiers} settings={settings} disabled={!anyOnSale} disabledLabel={statusLabel}/>

        {settings?.refundPolicyMd ? (<footer className="ticketed-event-footer">
            <h2>Refunds &amp; Support</h2>
            {settings.refundPolicyMd.split(/\n{2,}/).map((paragraph, idx) => (<p key={idx}>{paragraph}</p>))}
            {settings.supportEmail ? (<p>
                Questions? <a href={venuePath(`mailto:${settings.supportEmail}`)}>{settings.supportEmail}</a>
              </p>) : null}
            <p className="ticketed-event-fineprint">
              Venue ticketing terms to be added. <a href={venuePath("/privacy")}>Privacy Policy</a> ·{" "}
              <a href={venuePath("/terms")}>Terms</a>
            </p>
          </footer>) : (<footer className="ticketed-event-footer">
            <p className="ticketed-event-fineprint">
              Venue ticketing terms to be added. <a href={venuePath("/privacy")}>Privacy Policy</a> ·{" "}
              <a href={venuePath("/terms")}>Terms</a>
            </p>
          </footer>)}
      </article>
    </HolderPage>);
}
