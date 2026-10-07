"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CONSENT_DEFAULT,
  GA4_ID,
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
  TRACKING_VENUE,
  isTrackedPath,
  isTrackingActive,
  trackPageView,
} from "@/lib/tracking";

// Loads the business-wide GA4 / Meta Pixel / Google Ads tags once per page
// load. Mounted in the root layout; renders nothing unless
// NEXT_PUBLIC_TRACKING_ENABLED is "true" and at least one tag id is set.
// Staff routes never load tags (see isTrackedPath). Page views are sent
// manually with the query string stripped.
export default function TrackingScripts() {
  const pathname = usePathname() ?? "/";
  const active = isTrackingActive() && isTrackedPath(pathname);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    trackPageView();
  }, [active, pathname]);

  if (!active) return null;

  const gtagId = GA4_ID || GOOGLE_ADS_ID;

  return (
    <>
      {gtagId ? (
        <>
          <Script
            id="fwpm-gtag-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
          />
          <Script id="fwpm-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('consent', 'default', {
                ad_storage: '${CONSENT_DEFAULT}',
                ad_user_data: '${CONSENT_DEFAULT}',
                ad_personalization: '${CONSENT_DEFAULT}',
                analytics_storage: '${CONSENT_DEFAULT}'
              });
              gtag('js', new Date());
              ${GA4_ID ? `gtag('config', '${GA4_ID}', { send_page_view: false, content_group: '${TRACKING_VENUE}' });` : ""}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      ) : null}
      {META_PIXEL_ID ? (
        <Script id="fwpm-meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('consent', '${CONSENT_DEFAULT === "denied" ? "revoke" : "grant"}');
            fbq('init', '${META_PIXEL_ID}');
          `}
        </Script>
      ) : null}
    </>
  );
}
