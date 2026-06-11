/**
 * Contrato compartido entre el SDK del navegador (lib/savia/tracker-client.ts)
 * y el endpoint /api/track. Si cambia, hay que migrar ambos lados.
 *
 * Eventos "estándar" (los emite el SDK automáticamente o el código de
 * la app llamando a track()):
 *   page_view       — al cargar una página o cambiar de ruta SPA
 *   product_view    — al ver la ficha de un producto
 *   add_to_cart     — al añadir al carrito
 *   remove_from_cart— al sacar del carrito
 *   checkout_start  — al iniciar checkout
 *   checkout_step   — al avanzar de paso (props: {step, name})
 *   purchase        — al confirmar pago (props: {order_number, total_cop})
 *   search          — al ejecutar una búsqueda (props: {query, results_count})
 *   guide_view      — al leer una guía
 *   newsletter_signup — al suscribirse al newsletter
 *
 * Para eventos custom basta con pasar otro event_type. El SDK no valida
 * la lista — quien rompa el namespace estable rompe sus propios reportes.
 */

export type TrackEventInput = {
  visitor_id: string;
  session_id: string;
  event_type: string;
  event_props?: Record<string, unknown>;
  page_path: string;
  page_title?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  /**
   * "anonymous" → backend NO captura IP, UA literal ni customer_id.
   * "identified" → backend SÍ captura todo y enriquece. El cliente lo
   * envía como header `x-nv-consent`.
   */
  consent_mode: "anonymous" | "identified";
};
