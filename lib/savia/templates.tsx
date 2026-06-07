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
import { CartAbandoned1 } from "@/lib/email/templates/cart-abandoned-1";
import { CartAbandoned2 } from "@/lib/email/templates/cart-abandoned-2";
import { CartAbandoned3 } from "@/lib/email/templates/cart-abandoned-3";
import { RepurchaseReminder } from "@/lib/email/templates/repurchase-reminder";
import { ReactivationOffer } from "@/lib/email/templates/reactivation-offer";
import { listBestSellersForEmail } from "@/lib/catalog/listing-queries";
import { COMPANY } from "@/lib/legal/company-info";
import { shouldSkipCartAbandoned } from "@/lib/savia/cart-detection";
import { shouldSkipIfPurchasedSince } from "@/lib/savia/lifecycle-detection";
import { createOneTimeCoupon } from "@/lib/coupons/dynamic";

export type SaviaRenderContext = {
  toEmail: string;
  unsubscribeToken: string;
  jobId: string;
  payload: Record<string, unknown>;
};

type Renderer = (ctx: SaviaRenderContext) => Promise<ReactElement> | ReactElement;

/**
 * Predicate de tiempo de envío: si devuelve true, el dispatcher salta el
 * envío y marca el job como 'skipped'. Permite cancelar pasos posteriores
 * de un flow cuando la situación cambió (ej. el carrito ya se compró).
 * Cada template puede registrar el suyo; si no, no se salta nada.
 */
type SkipPredicate = (ctx: SaviaRenderContext) => Promise<boolean> | boolean;

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

/**
 * Predicate por slug de template. Solo los flows que necesitan filtrado en
 * tiempo de envío lo declaran. Para el resto, el dispatcher no salta nada.
 */
const SKIP_PREDICATES: Record<string, SkipPredicate> = {
  "cart-abandoned-1": (ctx) => shouldSkipCartAbandoned(ctx.payload),
  "cart-abandoned-2": (ctx) => shouldSkipCartAbandoned(ctx.payload),
  "cart-abandoned-3": (ctx) => shouldSkipCartAbandoned(ctx.payload),
  // Post-compra: si volvio a comprar tras enrolarse, no insistir.
  "repurchase-reminder": (ctx) => shouldSkipIfPurchasedSince(ctx.payload),
  "reactivation-offer": (ctx) => shouldSkipIfPurchasedSince(ctx.payload),
};

export async function shouldSkipSend(
  slug: string,
  ctx: SaviaRenderContext,
): Promise<boolean> {
  const pred = SKIP_PREDICATES[slug];
  if (!pred) return false;
  try {
    return await pred(ctx);
  } catch (err) {
    console.warn(`[savia/templates] predicate ${slug} fallo:`, err);
    return false;
  }
}

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

  "cart-abandoned-1": (ctx) => {
    const p = ctx.payload as {
      customerName?: string | null;
      items?: Array<{
        productName: string;
        productSlug: string;
        productImageUrl: string | null;
        quantity: number;
        priceCop: number;
      }>;
    };
    return CartAbandoned1({
      customerName: p.customerName ?? null,
      cartUrl: withAttribution("/carrito", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      items: (p.items ?? []).map((it) => ({
        name: it.productName,
        url: withAttribution(`/producto/${it.productSlug}`, ctx.jobId),
        imageUrl: it.productImageUrl,
        quantity: it.quantity,
        priceCop: it.priceCop,
      })),
    });
  },

  "cart-abandoned-2": async (ctx) => {
    const p = ctx.payload as {
      customerName?: string | null;
      items?: Array<{ productName: string }>;
    };
    // Prueba social dinamica: top vendedores actuales (render-time #4).
    const popular = await listBestSellersForEmail(3);
    return CartAbandoned2({
      customerName: p.customerName ?? null,
      cartUrl: withAttribution("/carrito", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      itemNames: (p.items ?? []).map((i) => i.productName).slice(0, 3),
      popularProducts: popular.map((pp) => ({
        name: pp.name,
        url: withAttribution(`/producto/${pp.slug}`, ctx.jobId),
      })),
    });
  },

  "cart-abandoned-3": async (ctx) => {
    const p = ctx.payload as { customerName?: string | null };
    // Cupon UNICO generado al despachar: si el paso 2 ya cerro la venta,
    // shouldSkip ya nos saco antes de aqui, no creamos un cupon huerfano.
    const expiresInHours = 48;
    const couponPercent = 5;
    const coupon = await createOneTimeCoupon({
      prefix: "RECUPERA",
      discountPercent: couponPercent,
      minOrderCop: 30000,
      maxDiscountCop: 50000,
      expiresInHours,
      description: `Recuperacion de carrito - job ${ctx.jobId}`,
    });
    if (!coupon.ok) {
      throw new Error(`No se pudo generar cupon: ${coupon.error}`);
    }
    return CartAbandoned3({
      customerName: p.customerName ?? null,
      cartUrl: withAttribution("/carrito", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      couponCode: coupon.code,
      couponPercent,
      expiresInHours,
    });
  },

  "repurchase-reminder": (ctx) => {
    const p = ctx.payload as {
      customerName?: string | null;
      products?: Array<{ name: string; slug: string; imageUrl: string | null }>;
    };
    return RepurchaseReminder({
      customerName: p.customerName ?? null,
      shopUrl: withAttribution("/tienda", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      products: (p.products ?? []).map((it) => ({
        name: it.name,
        url: withAttribution(`/producto/${it.slug}`, ctx.jobId),
        imageUrl: it.imageUrl,
      })),
    });
  },

  "reactivation-offer": async (ctx) => {
    const p = ctx.payload as { customerName?: string | null };
    // Cupon unico de reactivacion (mayor que cart, cliente mas frio).
    const expiresInHours = 7 * 24;
    const couponPercent = 8;
    const coupon = await createOneTimeCoupon({
      prefix: "VUELVE",
      discountPercent: couponPercent,
      minOrderCop: 30000,
      maxDiscountCop: 60000,
      expiresInHours,
      description: `Reactivacion 60d - job ${ctx.jobId}`,
    });
    if (!coupon.ok) {
      throw new Error(`No se pudo generar cupon: ${coupon.error}`);
    }
    return ReactivationOffer({
      customerName: p.customerName ?? null,
      shopUrl: withAttribution("/tienda", ctx.jobId),
      unsubscribeUrl: unsubscribePageUrl(ctx.unsubscribeToken),
      couponCode: coupon.code,
      couponPercent,
      expiresInHours,
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
