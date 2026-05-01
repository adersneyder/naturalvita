"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { useConsent } from "@/lib/cart/use-consent";

/**
 * Bundle único de analítica para el site público.
 *
 * Política de consentimiento (ley 1581/2012 Habeas Data):
 *   - Vercel Analytics + Speed Insights: SIEMPRE activos. Categoría
 *     "essential" porque son agregados anónimos sin cookies de tracking
 *     ni PII identificable.
 *   - Microsoft Clarity: solo si el usuario aceptó "analytics" en el
 *     banner. Registra session replays con IP, lo que es PII bajo la ley
 *     colombiana, así que requiere consentimiento explícito.
 *
 * GA4 se aplaza hasta que tengamos infraestructura de consent management
 * más rica. Por ahora, Vercel Analytics + Clarity con consentimiento son
 * suficientes para entender conversión.
 */
export default function SiteAnalytics() {
  const { state, isLoaded } = useConsent();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const clarityAllowed = isLoaded && state?.analytics === true;

  return (
    <>
      <Analytics />
      <SpeedInsights />
      {clarityId && clarityAllowed && (
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
