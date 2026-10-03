import { venuePath } from "@/lib/venue";
import Script from "next/script";
import { GOOGLE_ADS_ID, isGoogleAdsConfigured } from "@/lib/googleAds";
// Loads gtag.js once per page load using Next.js's afterInteractive
// strategy. Skipped in environments where the env vars aren't set,
// so we don't ship a gtag loader that would fire against an empty ID.
// If GA4 (or any other gtag consumer) is added later, add another
// `gtag('config', 'G-XXXXXXX')` line inside the inline script rather
// than loading gtag.js twice.
export default function GoogleAdsScript() {
    if (!isGoogleAdsConfigured())
        return null;
    return (<>
      <Script id="google-ads-loader" strategy="afterInteractive" src={venuePath(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`)}/>
      <Script id="google-ads-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
    </>);
}
