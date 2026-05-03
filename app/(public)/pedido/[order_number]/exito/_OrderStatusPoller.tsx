"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/use-cart";

type Props = {
  orderNumber: string;
  initialPaymentStatus: string;
};

type LiveStatus = "checking" | "paid" | "rejected" | "pending" | "refunded";

/**
 * Polling de estado de pago.
 *
 * Bold confirma el pago vía webhook → BD se actualiza. El cliente que
 * regresa de Bold no ve el cambio si solo hace render una vez. Hacemos
 * polling cada 3s hasta 30s. Si en 30s no hay confirmación, mostramos
 * "estamos procesando, te avisamos por email".
 *
 * Como side effect: cuando confirmamos `paid`, vaciamos el carrito local.
 */
export default function OrderStatusPoller({
  orderNumber,
  initialPaymentStatus,
}: Props) {
  const cart = useCart();
  const router = useRouter();
  const [status, setStatus] = useState<LiveStatus>(() =>
    mapPaymentStatus(initialPaymentStatus),
  );
  const [pollCount, setPollCount] = useState(0);
  const MAX_POLLS = 10; // 10 × 3s = 30s

  useEffect(() => {
    // Si ya está paid o rejected al cargar, no necesitamos polling
    if (status !== "pending" && status !== "checking") return;
    if (pollCount >= MAX_POLLS) return;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}/status`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setPollCount((n) => n + 1);
          return;
        }
        const json = (await res.json()) as { payment_status: string };
        const next = mapPaymentStatus(json.payment_status);
        setStatus(next);
        if (next === "pending") setPollCount((n) => n + 1);
      } catch {
        setPollCount((n) => n + 1);
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [pollCount, status, orderNumber]);

  // Side effect: al confirmar pago, vaciamos carrito local y hacemos refresh
  // del server component para que muestre el estado actualizado completo.
  useEffect(() => {
    if (status === "paid" && cart.items.length > 0) {
      cart.clear();
      router.refresh();
    }
  }, [status, cart, router]);

  const card = renderCard(status);

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${card.className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5">{card.icon}</span>
        <div className="flex-1">
          <p className="font-serif text-lg text-[var(--color-leaf-900)]">
            {card.title}
          </p>
          <p className="text-sm text-[var(--color-earth-700)] mt-1 leading-relaxed">
            {card.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function mapPaymentStatus(s: string): LiveStatus {
  if (s === "paid") return "paid";
  if (s === "rejected" || s === "cancelled" || s === "failed") return "rejected";
  if (s === "refunded") return "refunded";
  return "pending";
}

function renderCard(status: LiveStatus) {
  switch (status) {
    case "paid":
      return {
        className:
          "bg-[var(--color-leaf-100)]/50 border-[var(--color-leaf-100)]",
        icon: (
          <CheckCircle2
            size={24}
            strokeWidth={1.8}
            className="text-[var(--color-leaf-700)]"
          />
        ),
        title: "Pago confirmado",
        subtitle:
          "Recibimos tu pago. Despachamos en 24-48 horas y te avisamos por correo cuando salga.",
      };
    case "rejected":
      return {
        className: "bg-red-50 border-red-200",
        icon: <XCircle size={24} strokeWidth={1.8} className="text-red-700" />,
        title: "El pago no se completó",
        subtitle:
          "El pago fue rechazado por el banco o la pasarela. No realizamos cobro. Puedes reintentar desde tu carrito o usar otro método.",
      };
    case "refunded":
      return {
        className: "bg-[var(--color-earth-50)] border-[var(--color-earth-100)]",
        icon: (
          <AlertCircle
            size={24}
            strokeWidth={1.8}
            className="text-[var(--color-earth-700)]"
          />
        ),
        title: "Pedido reembolsado",
        subtitle:
          "Este pedido fue reembolsado. El dinero regresa a tu medio de pago en 5-10 días hábiles según tu banco.",
      };
    case "pending":
    case "checking":
    default:
      return {
        className:
          "bg-[var(--color-earth-50)] border-[var(--color-earth-100)]",
        icon: (
          <Loader2
            size={24}
            strokeWidth={1.8}
            className="text-[var(--color-iris-700)] animate-spin"
          />
        ),
        title: "Procesando tu pago",
        subtitle:
          "Estamos confirmando con la pasarela. Si demora más de un minuto te avisamos por correo cuando esté listo. Puedes cerrar esta página sin problema.",
      };
  }
}
