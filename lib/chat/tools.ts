import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY } from "@/lib/legal/company-info";

/**
 * Tools del Asistente NV. Definiciones JSON schema (formato Anthropic) +
 * sus implementaciones. El loop del agente (lib/chat/agent.ts) recibe
 * tool_use blocks de Claude, ejecuta la función correspondiente, y
 * devuelve tool_result al siguiente turno.
 *
 * Principios:
 *   - Determinismo: cada tool retorna datos crudos de BD, no narrativa.
 *   - Privacidad: get_order_status requiere order_number + email.
 *   - Cero side-effects desde tools — son lectura pura.
 */

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Busca productos del catálogo de NaturalVita. Úsalo cuando el cliente pregunta por categoría, beneficio buscado, ingrediente, o nombre parcial. Devuelve hasta 5 productos con nombre, slug, precio, y descripción corta.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Texto de búsqueda: nombre, ingrediente, o necesidad (ej. 'colágeno', 'piel grasa', 'vitamina D').",
        },
        limit: {
          type: "integer",
          description: "Máximo de resultados a devolver. Default 5.",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product",
    description:
      "Obtiene detalle completo de un producto por su slug. Úsalo cuando ya identificaste el producto exacto y necesitas composición, modo de uso, presentación, registro INVIMA, precio y stock.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "Slug del producto (ej. 'naturfar-fibra-prebiotica-250ml'). Lo obtienes de search_products.",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_shipping_info",
    description:
      "Información oficial de envíos: tiempos por departamento, costo, transportadoras. Úsalo cuando preguntan cuánto cuesta envío o cuánto demora.",
    input_schema: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description:
            "Departamento de Colombia (opcional). Ej. 'Cundinamarca', 'Antioquia'. Si no lo das, devuelve política general.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_company_info",
    description:
      "Info de NaturalVita: razón social, NIT, dirección, contacto, horarios, políticas (devoluciones, privacidad). Úsalo para preguntas sobre la empresa.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_order_status",
    description:
      "Consulta el estado de un pedido. REQUIERE el número de pedido (formato NV-YYYYMMDD-XXXX) Y el correo electrónico del titular. Solo devuelve datos si AMBOS coinciden — protección de privacidad. Úsalo cuando el cliente pregunta por su pedido y te da ambos datos.",
    input_schema: {
      type: "object",
      properties: {
        order_number: {
          type: "string",
          description: "Número de pedido, formato NV-YYYYMMDD-XXXX.",
        },
        email: {
          type: "string",
          description: "Correo electrónico con el que se hizo el pedido.",
        },
      },
      required: ["order_number", "email"],
    },
  },
  {
    name: "request_human",
    description:
      "Escala la conversación a un miembro del equipo humano. Úsalo cuando: el cliente está molesto, pide cancelar/cambiar un pedido, reporta un problema (no llegó, llegó dañado), pide consejo médico específico, pide hablar con un humano, o haces una pregunta que no puedes responder con las otras herramientas. Después de llamar esta tool, dile al cliente que lo conectas con el equipo y que no cierre la ventana.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Resumen breve del caso para el equipo (ej. 'Cliente reporta pedido NV-... no recibido'). Una frase.",
        },
        category: {
          type: "string",
          enum: ["pedido", "queja", "medico", "general", "otro"],
          description: "Categoría del motivo de escalación.",
        },
      },
      required: ["reason"],
    },
  },
];

// ============================================================
// Implementaciones
// ============================================================

type ToolResult = string;

/**
 * Contexto que el loop del agente pasa a las tools. request_human lo
 * necesita para escalar la conversación correcta.
 */
export type ToolContext = {
  conversationId: string;
};

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (name) {
    case "search_products":
      return await searchProducts(input);
    case "get_product":
      return await getProduct(input);
    case "get_shipping_info":
      return await getShippingInfo(input);
    case "get_company_info":
      return getCompanyInfo();
    case "get_order_status":
      return await getOrderStatus(input);
    case "request_human":
      return await requestHuman(input, ctx);
    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` });
  }
}

async function searchProducts(input: Record<string, unknown>): Promise<ToolResult> {
  const query = typeof input.query === "string" ? input.query.trim() : "";
  const limit = Math.min(
    10,
    Math.max(1, typeof input.limit === "number" ? input.limit : 5),
  );
  if (!query) return JSON.stringify({ error: "query vacío" });

  const admin = createAdminClient();
  // Búsqueda ilike sobre nombre y short_description. En el futuro se
  // reemplaza por búsqueda semántica con embeddings.
  const { data } = await admin
    .from("products")
    .select(
      "slug, name, presentation, price_cop, short_description, status, is_active",
    )
    .eq("status", "active")
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,short_description.ilike.%${query}%`)
    .limit(limit);

  return JSON.stringify({
    results: (data ?? []).map((p) => ({
      slug: p.slug,
      name: p.name,
      presentation: p.presentation,
      price_cop: p.price_cop,
      short_description: p.short_description,
    })),
  });
}

async function getProduct(input: Record<string, unknown>): Promise<ToolResult> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (!slug) return JSON.stringify({ error: "slug vacío" });

  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select(
      `slug, name, presentation, price_cop, compare_at_price_cop, stock,
       short_description, description, composition_use, invima_number,
       laboratory:laboratories!laboratory_id(name),
       category:categories!category_id(name)`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return JSON.stringify({ error: "Producto no encontrado o no activo" });

  return JSON.stringify({
    slug: data.slug,
    name: data.name,
    presentation: data.presentation,
    price_cop: data.price_cop,
    compare_at_price_cop: data.compare_at_price_cop,
    in_stock: data.stock > 0,
    short_description: data.short_description,
    description: data.description,
    composition_use: data.composition_use,
    invima_number: data.invima_number,
    laboratory: (data.laboratory as { name: string } | null)?.name ?? null,
    category: (data.category as { name: string } | null)?.name ?? null,
    product_url: `https://naturalvita.co/producto/${data.slug}`,
  });
}

async function getShippingInfo(input: Record<string, unknown>): Promise<ToolResult> {
  const department =
    typeof input.department === "string" ? input.department.trim() : "";

  const admin = createAdminClient();
  const { data: rates } = await admin
    .from("shipping_rates")
    .select("department, flat_cop, free_above_cop, notes")
    .eq("is_active", true)
    .order("department");

  const matched =
    department && rates
      ? rates.filter((r) =>
          r.department.toLowerCase().includes(department.toLowerCase()),
        )
      : rates;

  return JSON.stringify({
    note: "Tiempo estimado: 2-5 días hábiles para ciudades capitales, 3-7 días para zonas alejadas. Depende del transportador.",
    rates: (matched ?? []).map((r) => ({
      department: r.department,
      cost_cop: r.flat_cop,
      free_shipping_above_cop: r.free_above_cop,
      notes: r.notes,
    })),
  });
}

function getCompanyInfo(): ToolResult {
  return JSON.stringify({
    legal_name: COMPANY.legalName,
    brand: COMPANY.brandName,
    nit: COMPANY.nit,
    address: `${COMPANY.addressStreet}, ${COMPANY.addressCity}, ${COMPANY.addressDepartment}, ${COMPANY.addressCountry}`,
    email: COMPANY.publicEmail,
    phone: COMPANY.publicPhone,
    site_url: COMPANY.siteUrl,
    policies: {
      privacy: `${COMPANY.siteUrl}/legal/privacidad`,
      terms: `${COMPANY.siteUrl}/legal/terminos`,
      shipping: `${COMPANY.siteUrl}/legal/envios`,
    },
  });
}

/**
 * Consulta de pedido con doble verificación order_number + email.
 * NUNCA devuelve datos si el email no coincide con el del pedido —
 * protección contra enumeración de pedidos ajenos.
 *
 * No exponemos datos sensibles (dirección completa, teléfono): solo
 * lo necesario para que el cliente sepa en qué va su pedido.
 */
async function getOrderStatus(input: Record<string, unknown>): Promise<ToolResult> {
  const orderNumber =
    typeof input.order_number === "string" ? input.order_number.trim().toUpperCase() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (!orderNumber || !email) {
    return JSON.stringify({
      error: "missing_fields",
      message: "Necesito el número de pedido y el correo con el que se hizo.",
    });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      `order_number, customer_email, status, payment_status, fulfillment_status,
       shipping_carrier, tracking_number, total_cop, created_at,
       shipping_city, shipping_department,
       items:order_items!order_id(product_name, quantity)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  // Verificación: existe Y el email coincide. Mensaje genérico para no
  // revelar si el pedido existe con otro email (anti-enumeración).
  if (!order || order.customer_email.toLowerCase() !== email) {
    return JSON.stringify({
      error: "not_found_or_mismatch",
      message:
        "No encontré un pedido con ese número y correo. Verifica que ambos sean correctos. Si el problema persiste, puedo conectarte con el equipo.",
    });
  }

  return JSON.stringify({
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    carrier: order.shipping_carrier,
    tracking_number: order.tracking_number,
    total_cop: order.total_cop,
    created_at: order.created_at,
    ship_to: `${order.shipping_city}, ${order.shipping_department}`,
    items: (order.items as Array<{ product_name: string; quantity: number }>).map(
      (i) => ({ product_name: i.product_name, quantity: i.quantity }),
    ),
    note: "Si el pedido tiene tracking_number, el cliente puede rastrearlo con el transportador. No prometas fechas exactas de entrega.",
  });
}

/**
 * Escala la conversación a un humano. Cambia status a 'escalated',
 * registra escalated_at, y crea un mensaje de sistema con el motivo.
 * El inbox del equipo lo recibe en tiempo real (Realtime).
 *
 * NO crea tarea aquí — eso lo hace un failsafe (cron) si nadie
 * responde en 30 min, para no inundar la bandeja con cada escalación.
 */
async function requestHuman(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const reason =
    typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
  const category =
    typeof input.category === "string" ? input.category : "general";

  const admin = createAdminClient();

  // Solo escalamos si no estaba ya escalada/asignada.
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("status")
    .eq("id", ctx.conversationId)
    .maybeSingle();

  if (conv && (conv.status === "escalated" || conv.status === "assigned")) {
    return JSON.stringify({
      ok: true,
      already_escalated: true,
      message: "La conversación ya está con el equipo.",
    });
  }

  await admin
    .from("chat_conversations")
    .update({
      status: "escalated",
      escalated_at: new Date().toISOString(),
      resolved_intent: `escalated_${category}`,
    })
    .eq("id", ctx.conversationId);

  // Mensaje de sistema con el motivo (visible en el inbox como contexto).
  await admin.from("chat_messages").insert({
    conversation_id: ctx.conversationId,
    role: "system",
    content: `[Escalado a humano] Categoría: ${category}. Motivo: ${reason}`,
  });

  return JSON.stringify({
    ok: true,
    escalated: true,
    message:
      "Conversación escalada al equipo. El cliente recibirá respuesta humana en su ventana de chat.",
  });
}
