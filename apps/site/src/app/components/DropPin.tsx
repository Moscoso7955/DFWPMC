"use client";
import { useEffect, useState } from "react";
import { useVenue } from "./VenueProvider";

// Every venue lives inside the Fort Worth Public Market, so they share
// the market's address; the pin and the share text carry the venue's name.
const MARKET_ADDRESS = "1400 Henderson St, Fort Worth, TX 76102";

function getIsAppleDevice() {
    if (typeof navigator === "undefined")
        return false;
    return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
}

function mapUrls(name: string) {
    const mapText = `${name} - Fort Worth Public Market, ${MARKET_ADDRESS}`;
    return {
        apple: `https://maps.apple.com/?q=${encodeURIComponent(name)}&address=${encodeURIComponent(MARKET_ADDRESS)}`,
        google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapText)}`,
        shareText: `Meet me at ${mapText}`,
    };
}

export default function DropPin() {
    const { venue } = useVenue();
    const { apple, google, shareText } = mapUrls(venue.name);
    const dropPin = async () => {
        const isAppleDevice = getIsAppleDevice();
        const mapsUrl = isAppleDevice ? apple : google;
        if (navigator.share) {
            try {
                await navigator.share({ title: venue.name, text: shareText, url: mapsUrl });
                return;
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError")
                    return;
            }
        }
        if (isAppleDevice) {
            window.location.href = `sms:&body=${encodeURIComponent(`${shareText}\n${apple}`)}`;
            return;
        }
        window.open(mapsUrl, "_blank", "noopener,noreferrer");
    };
    return (<section className="visit-card" aria-label="Share our location">
      <button type="button" onClick={dropPin}>
        <span>Drop A Pin</span>
        <svg className="visit-pin-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z"/>
          <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"/>
        </svg>
      </button>
    </section>);
}

// The address at the top of Visit: tap it to open directions in the
// phone's own maps app, with both map links underneath.
export function VisitAddress() {
    const { venue } = useVenue();
    const { apple, google } = mapUrls(venue.name);
    const [mapsUrl, setMapsUrl] = useState(google);
    useEffect(() => {
        if (getIsAppleDevice())
            setMapsUrl(apple);
    }, [apple]);
    return (<section className="visit-card" aria-label={`Visit ${venue.name}`}>
      <a className="visit-address" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        {MARKET_ADDRESS}
      </a>
      <div className="visit-map-links" aria-label="Map links">
        <a href={apple}>Apple Maps</a>
        <a href={google}>Google Maps</a>
      </div>
    </section>);
}
