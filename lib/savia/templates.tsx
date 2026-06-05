/**
 * lib/savia/templates.tsx
 *
 * Registro de plantillas de Savia. Mapea un slug de template (guardado en
 * email_flow_steps.template y email_jobs.template) a un renderer que produce
 * el ReactElement listo para enviar.
 *
 * Dos principios clave:
 *   - Render dinámico (#4): el renderer resuelve referencias en el MOMENTO
 *     del envío (ej. los más vendidos actuales), no cuando se encoló el job.
 *     El payload guarda intención/IDs, no HTML cocido.
 *   - Atribución (#1): los enlaces internos llevan `?sj={jobId}` para que el
 *     middleware pueda atribuir un pedido posterior al correo que lo originó.
 */

import type { ReactElement } from "react";
import { NewsletterWelcome } from "@/lib/email/templates/newsletter-welcome";
import { WelcomeFollowup } from "@/lib/email/templates/welcome-followup";
import { listBestSellersForEmail } from "@/lib/catalog/listing-queries";
import { COMPANY } from "@/lib/legal/company-info";

export type SaviaRenderContext = {
  toEmail: string;
  unsubscribeToken: string;
  jobId: string;
  payload: Record<string, unknown>;
};

type Renderer = (ctx: SaviaRenderContext) => Promise<ReactElement> | ReactElement;

/** Añade el parámetro de atribución de Savia a una ruta interna (#1). */
function withAttribution(path: string, jobId: string): string {
  const url = new URL(path, COMPANY.url);
  url.searchParams.set("sj", jobId);
  return url.toString();
}

/** URL de la página de desuscripción con estética del sitio. */
function unsubscribePageUrl(token: string): string {
  return `${COMPANY.url}/newsletter/desuscribir/${token}`;
}

const DEFAULT_COUPON = "WELCOME10";
const DEFAULT_COUPON_DESC =
  "10% en tu primera compra · mínimo $30.000 · descuento máximo $50.000";

const REGISTRY: Record<string, Renderer> = {
  "newsletter-welcome": (ctx) => {
    const p = ctx.payload as {
      customerName?: string | null;
      couponCode?: string;
      couponDescription?: string;
    };
    return NewsletterWelcome({
      customerName: p.customerName ?? null,
      couponCode: p.couponCode ?? DEFAULT_COUPON,
      couponDescription: p.couponDescription ?? DEFAULT_COUPON_DESC,
      shopUrl: withAttribution("/tienda", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
    });
  },

  "welcome-followup": async (ctx) => {
    const p = ctx.payload as {
      customerName?: string | null;
      couponCode?: string;
    };
    // #4: catálogo resuelto al despachar, no al encolar.
    const items = await listBestSellersForEmail(3);
    return WelcomeFollowup({
      customerName: p.customerName ?? null,
      couponCode: p.couponCode ?? DEFAULT_COUPON,
      shopUrl: withAttribution("/tienda", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      bestSellers: items.map((i) => ({
        name: i.name,
        url: withAttribution(`/producto/${i.slug}`, ctx.jobId),
        imageUrl: i.imageUrl,
      })),
    });
  },
};

export function isKnownTemplate(slug: string): boolean {
  return slug in REGISTRY;
}

export async function renderSaviaTemplate(
  slug: string,
  ctx: SaviaRenderContext,
): Promise<ReactElement> {
  const renderer = REGISTRY[slug];
  if (!renderer) {
    throw new Error(`[savia/templates] Template desconocido: ${slug}`);
  }
  return renderer(ctx);
}
