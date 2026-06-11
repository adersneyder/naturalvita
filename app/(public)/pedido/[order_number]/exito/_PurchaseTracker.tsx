"use client";

import { useEffect } from "react";
import { track } from "@/lib/savia/tracker";

const DEDUP_KEY = "nv:tracked-purchases:v1";

/**
 * Dispara el evento `purchase` UNA sola vez por orden, incluso si el
 * usuario refresca la página, navega afuera y vuelve, o llega desde el
 * email transaccional. Deduplicamos por `order_number` en sessionStorage
 * (que se limpia al cerrar el navegador, suficiente para nuestro caso).
 *
 * Si el storage está bloqueado (modo incógnito de Safari), igual
 * disparamos — preferimos un duplicado ocasional a perder el evento.
 */
export default function PurchaseTracker({
  orderNumber,
  totalCop,
  isPaid,
}: {
  orderNumber: string;
  totalCop: number;
  isPaid: boolean;
}) {
  useEffect(() => {
    // Solo trackeamos cuando el pago está confirmado. Una visita a la
    // página de éxito con payment_status=pending NO es un purchase aún.
    if (!isPaid) return;

    let alreadyTracked = false;
    try {
      const raw = sessionStorage.getItem(DEDUP_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (list.includes(orderNumber)) {
        alreadyTracked = true;
      } else {
        list.push(orderNumber);
        // Mantenemos solo las últimas 20 para no crecer indefinidamente.
        sessionStorage.setItem(DEDUP_KEY, JSON.stringify(list.slice(-20)));
      }
    } catch {
      // Storage bloqueado — seguimos.
    }

    if (alreadyTracked) return;

    track("purchase", {
      order_number: orderNumber,
      total_cop: totalCop,
    });
  }, [orderNumber, totalCop, isPaid]);

  return null;
}
