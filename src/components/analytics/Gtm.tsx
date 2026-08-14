import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { GTM_ID, trackPageView } from "@/lib/analytics";

/** Google Ads (gtag.js) conversion tag. */
export const GOOGLE_ADS_ID = "AW-18245500144";

/** Google Analytics 4 measurement ID. */
export const GA4_ID = "G-E710D91QL7";

export const gtagSrc = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;

export const gtagInitScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');gtag('config','${GOOGLE_ADS_ID}');`;

/** Inline GTM loader snippet (only rendered when VITE_GTM_ID is configured). */
export const gtmHeadScript = GTM_ID
  ? `(function(w,d,s,l,i){if(w.__gtmLoaded)return;w.__gtmLoaded=true;w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`
  : "";


export function GtmNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}

/** Fires exactly one page_view per resolved route (including the first load). */
export function GtmPageViews() {
  const router = useRouter();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const fire = () => {
      const path = window.location.pathname + window.location.search;
      if (lastPath.current === path) return;
      lastPath.current = path;
      trackPageView();
    };
    fire();
    const unsub = router.subscribe("onResolved", fire);
    return () => unsub();
  }, [router]);

  return null;
}
