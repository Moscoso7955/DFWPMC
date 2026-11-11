"use client";

const BAR_NAME = "The Public Market";
const BAR_ADDRESS = "1400 Henderson St, Fort Worth, TX 76102";
const MAP_TEXT = `${BAR_NAME} - ${BAR_ADDRESS}`;
const APPLE_MAPS_URL = `https://maps.apple.com/?q=${encodeURIComponent(BAR_NAME)}&address=${encodeURIComponent(
  BAR_ADDRESS,
)}`;
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_TEXT)}`;
const SHARE_TEXT = `Meet me at ${MAP_TEXT}`;

function getIsAppleDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
}

export default function DropPin() {
  const dropPin = async () => {
    const isAppleDevice = getIsAppleDevice();
    const mapsUrl = isAppleDevice ? APPLE_MAPS_URL : GOOGLE_MAPS_URL;

    if (navigator.share) {
      try {
        await navigator.share({
          title: BAR_NAME,
          text: SHARE_TEXT,
          url: mapsUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (isAppleDevice) {
      window.location.href = `sms:&body=${encodeURIComponent(`${SHARE_TEXT}\n${APPLE_MAPS_URL}`)}`;
      return;
    }

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="visit-card" aria-label="Visit The Public Market">
      <p>{BAR_ADDRESS}</p>
      <button type="button" onClick={dropPin}>
        <span>Drop A Pin</span>
        <svg className="visit-pin-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" />
          <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
        </svg>
      </button>
      <div className="visit-map-links" aria-label="Map links">
        <a href={APPLE_MAPS_URL}>Apple Maps</a>
        <a href={GOOGLE_MAPS_URL}>Google Maps</a>
      </div>
    </section>
  );
}
