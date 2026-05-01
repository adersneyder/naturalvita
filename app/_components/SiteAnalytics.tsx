"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

/**
 * Bundle único de analítica para el site público.
 *
 *   - Vercel Analytics: pageviews y eventos custom (gratis en plan Hobby).
 *   - Vercel Speed Insights: Core Web Vitals reales en producción.
 *   - Microsoft Clarity: heatmaps y session replay (gratis sin tope).
 *
 * Clarity se carga solo si NEXT_PUBLIC_CLARITY_ID está poblado.
 * Esto protege previews y entornos locales sin tener que comentar/descomentar.
 *
 * GA4 se aplaza hasta que tengamos banner de consentimiento Habeas Data
 * (ley 1581 colombiana). No lo registramos sin permiso del visitante.
 */
export default function SiteAnalytics() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <>
      <Analytics />
      <SpeedInsights />
      {clarityId && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}
    </>
  );
}
