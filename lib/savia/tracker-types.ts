/**
 * Contrato compartido entre el SDK del navegador (lib/savia/tracker.ts)
 * y el endpoint /api/savia/track. Si cambia, hay que migrar ambos lados.
 *
 * Eventos "estándar" (los emite el SDK automáticamente o el código de
 * la app llamando a track()):
 *   page_view       — al cargar una página o cambiar de ruta SPA
 *   product_view    — al ver la ficha de un producto
 *   add_to_cart     — al añadir al carrito
 *   remove_from_cart— al sacar del carrito
 *   view_cart       — al abrir el drawer del carrito
 *   checkout_start  — al iniciar checkout
 *   add_payment_info— al abrir el modal de pago (Bold)
 *   purchase        — al confirmar pago (props: {order_number, total_cop})
 *   search_performed— al ejecutar una búsqueda (props: {query, results_count})
 *   guide_view      — al leer una guía
 *   newsletter_signup — al suscribirse al newsletter
 *
 *   identify        — evento especial: el cliente acaba de iniciar
 *                     sesión. El backend llama a la RPC
 *                     `rewire_visitor_to_customer` para reasignar TODOS
 *                     los eventos previos del visitor_id al customer_id.
 *                     Requiere consent_mode = "identified" (sin consent
 *                     no podemos vincular nada a una persona).
 *                     event_props: { customer_id: string }
 *
 * Para eventos custom basta con pasar otro event_type. El SDK no valida
 * la lista — quien rompa el namespace estable rompe sus propios reportes.
 *
 * COMPATIBILIDAD: el contrato es aditivo. El endpoint acepta tanto un
 * evento suelto (POST con TrackEventInput) como un array (POST con
 * { events: TrackEventInput[] }). El SDK actual envía single; el SDK
 * con buffer envía batch — el endpoint sirve ambos.
 */

export type TrackEventInput = {
  visitor_id: string;
  session_id: string;
  event_type: string;
  event_props?: Record<string, unknown>;
  page_path: string;
  page_title?: string;
  referrer?: string;
  /**
   * UTM de last-touch dentro de la sesión actual (capturado al primer
   * page_view con utm_* en la URL).
   */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  /**
   * UTM de first-touch persistente para este visitor_id. Se guarda en
   * localStorage la primera vez que vemos UTM y se mantiene para siempre
   * (o hasta que el usuario borre su identificador en /mi-cuenta).
   * Habilita atribución first/last/linear desde la misma fila.
   */
  utm_first?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  /**
   * Timestamp ISO en el cliente cuando ocurrió el evento. El backend
   * sigue usando `now()` como created_at canónico para evitar relojes
   * desfasados, pero este campo permite a los agentes reconstruir el
   * orden real cuando el batch llega tarde (ej. enviado en pagehide).
   */
  client_ts?: string;
  /**
   * "anonymous" → backend NO captura IP, UA literal ni customer_id.
   * "identified" → backend SÍ captura todo y enriquece. Se manda en el
   * body por evento para soportar sendBeacon (no acepta headers custom).
   * El header `x-nv-consent` sigue aceptado por compatibilidad.
   */
  consent_mode: "anonymous" | "identified";
};

/**
 * Payload aceptado por POST /api/savia/track. Acepta uno o muchos para
 * que el SDK pueda enviar batches sin nueva ruta.
 */
export type TrackRequestBody =
  | TrackEventInput
  | { events: TrackEventInput[] };
