import { NextResponse } from "next/server";
import { calculateShipping } from "@/lib/checkout/shipping";

/**
 * Endpoint para que el sidebar del checkout calcule envío en vivo cuando
 * el usuario cambia la dirección seleccionada.
 *
 * GET /api/checkout/shipping?department=Bogotá%20D.C.&subtotal=150000
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const subtotalStr = searchParams.get("subtotal");

  if (!department || !subtotalStr) {
    return NextResponse.json(
      { error: "department y subtotal son requeridos" },
      { status: 400 },
    );
  }

  const subtotal = parseInt(subtotalStr, 10);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ error: "subtotal inválido" }, { status: 400 });
  }

  const quote = await calculateShipping(department, subtotal);
  return NextResponse.json(quote);
}
