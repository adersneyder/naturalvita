"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    BoldCheckout?: new (config: BoldCheckoutConfig) => {
      open: () => void;
    };
  }
}

type BoldCheckoutConfig = {
  orderId: string;
  currency: "COP" | "USD";
  amount: string;
  apiKey: string;
  integritySignature: string;
  description: string;
  redirectionUrl: string;
  customerData?: string;
  billingAddress?: string;
  renderMode?: "embedded";
};

type Props = {
  orderNumber: string;
  amountCop: number;
  apiKey: string;
  integritySignature: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  customerDocumentType: string | null;
  customerDocumentNumber: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingDepartment: string;
  shippingPostalCode: string | null;
  description: string;
  /** URL absoluta al pedido tras el pago. Bold redirige aquí. */
  redirectionUrl: string;
  /** Llamada cuando el botón está listo o falla la carga. */
  onReady?: () => void;
  onError?: (msg: string) => void;
};

const BOLD_SCRIPT_SRC =
  "https://checkout.bold.co/library/boldPaymentButton.js";

/**
 * Botón "Confirmar y pagar" usando integración personalizada de Bold.
 *
 * Cargamos el script de Bold dinámicamente, instanciamos `BoldCheckout` con
 * los datos del pedido + firma de integridad calculada en el server, y al
 * click abrimos la pasarela en modo embedded (overlay sobre el sitio, sin
 * redirección).
 *
 * El integritySignature ya viene calculado del server con la secret key.
 * El cliente NUNCA tiene acceso a la secret.
 */
export default function BoldCheckoutButton({
  orderNumber,
  amountCop,
  apiKey,
  integritySignature,
  customerEmail,
  customerName,
  customerPhone,
  customerDocumentType,
  customerDocumentNumber,
  shippingStreet,
  shippingCity,
  shippingDepartment,
  shippingPostalCode,
  description,
  redirectionUrl,
  onReady,
  onError,
}: Props) {
  const [scriptReady, setScriptReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const checkoutRef = useRef<{ open: () => void } | null>(null);

  // Cargar el script de Bold una sola vez por sesión
  useEffect(() => {
    // ¿ya está cargado?
    if (window.BoldCheckout) {
      setScriptReady(true);
      onReady?.();
      return;
    }

    // ¿script ya en el DOM?
    const existing = document.querySelector(
      `script[src="${BOLD_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = BOLD_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      setScriptReady(true);
      onReady?.();
    };
    script.onerror = () => {
      onError?.("No pudimos cargar la pasarela de pagos. Revisa tu conexión.");
    };
    document.head.appendChild(script);
  }, [onReady, onError]);

  function handleClick() {
    if (!window.BoldCheckout) {
      onError?.("La pasarela aún se está cargando, intenta en un momento.");
      return;
    }
    if (opening) return;
    setOpening(true);

    try {
      // Datos del cliente para precarga (Bold los muestra ya llenados)
      const customerData = JSON.stringify({
        email: customerEmail,
        fullName: customerName,
        phone: customerPhone ?? "",
        dialCode: "+57",
        documentNumber: customerDocumentNumber ?? "",
        documentType: customerDocumentType ?? "CC",
      });

      const billingAddress = JSON.stringify({
        address: shippingStreet,
        zipCode: shippingPostalCode ?? "",
        city: shippingCity,
        state: shippingDepartment,
        country: "CO",
      });

      const checkout = new window.BoldCheckout!({
        orderId: orderNumber,
        currency: "COP",
        amount: String(amountCop),
        apiKey,
        integritySignature,
        description,
        redirectionUrl,
        customerData,
        billingAddress,
        renderMode: "embedded",
      });

      checkoutRef.current = checkout;
      checkout.open();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error iniciando el pago";
      console.error("[BoldCheckoutButton]", err);
      onError?.(msg);
    } finally {
      setOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!scriptReady || opening}
      className="w-full px-5 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {!scriptReady
        ? "Cargando pasarela…"
        : opening
          ? "Abriendo pasarela…"
          : "Confirmar y pagar con Bold"}
    </button>
  );
}
