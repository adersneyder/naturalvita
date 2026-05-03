import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/orders/[order_number]/status
 *
 * Devuelve solo el payment_status y status de una orden.
 * Usado por el componente OrderStatusPoller en /pedido/[order_number]/exito
 * para detectar cuando el webhook de Bold actualiza la orden.
 *
 * Filtrado por customer_id vía RLS: cada cliente solo ve sus órdenes.
 * Si la orden no existe o no pertenece al cliente, devolvemos 404.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ order_number: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { order_number } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("payment_status, status, paid_at")
    .eq("order_number", order_number)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    order_number,
    payment_status: data.payment_status,
    status: data.status,
    paid_at: data.paid_at,
  });
}
