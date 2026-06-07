/**
 * app/api/savia/unsubscribe/route.ts
 *
 * Endpoint de desuscripción one-click (RFC 8058) referenciado en el header
 * List-Unsubscribe de cada correo de Savia.
 *
 *   POST  → invocado automáticamente por Gmail/Outlook al pulsar el botón
 *           nativo "Cancelar suscripción". Sin interacción del usuario,
 *           sin render: procesa el token y responde 200. Idempotente.
 *   GET   → un humano que pega el link en el navegador; redirige a la
 *           página de confirmación con estética del sitio.
 *
 * El token viaja en el query string (?token=...). La baja marca al
 * suscriptor como 'unsubscribed' Y lo añade a email_suppressions (compuerta
 * global respetada por sendEmail), vía unsubscribeFromNewsletter.
 */

import { NextResponse, type NextRequest } from "next/server";
import { processSaviaUnsubscribe } from "@/lib/savia/unsubscribe-token";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const result = await processSaviaUnsubscribe(token);

  // RFC 8058: el cliente de correo solo mira el código 2xx. Devolvemos 200
  // incluso si el token no resolvió, para no exponer si un email existe o no
  // y porque la baja es idempotente. Logueamos el caso de error.
  if (!result.ok) {
    console.warn(
      "[savia/unsubscribe] token no resuelto en one-click:",
      result.error,
    );
  }

  return NextResponse.json({ status: "ok" });
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Delegamos a la página con estética del sitio, que ya procesa la baja.
  return NextResponse.redirect(
    new URL(`/newsletter/desuscribir/${encodeURIComponent(token)}`, request.url),
  );
}
