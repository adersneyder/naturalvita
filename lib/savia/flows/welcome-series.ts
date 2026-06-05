/**
 * lib/savia/flows/welcome-series.ts
 *
 * Definición canónica (declarativa) de la serie de bienvenida de Savia.
 * La fuente de verdad operativa vive en BD (email_flows + email_flow_steps,
 * sembrada por la migración savia_seed_welcome_series); este archivo es el
 * espejo tipado para referencia en código y para enrolar sin strings mágicos.
 *
 * Flujo:
 *   1. Inmediato  → newsletter-welcome (cupón WELCOME10).
 *   2. +3 días    → welcome-followup (recordatorio + más vendidos dinámicos).
 */

export const WELCOME_SERIES_SLUG = "welcome-series" as const;

export const WELCOME_SERIES = {
  slug: WELCOME_SERIES_SLUG,
  triggerEvent: "newsletter_subscribed",
  steps: [
    { order: 1, delaySeconds: 0, template: "newsletter-welcome" },
    { order: 2, delaySeconds: 3 * 24 * 60 * 60, template: "welcome-followup" },
  ],
} as const;
