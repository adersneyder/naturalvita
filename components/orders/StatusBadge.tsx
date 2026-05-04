/**
 * Badge visual para estados de pedido.
 *
 * Mapea cada estado canónico del CHECK constraint a un par de colores
 * leaf/earth/iris coherentes con el resto del sitio. Ningún rojo ni
 * verde brillante — paleta sobria de boutique.
 *
 * Estados de `status`: pending, paid, processing, shipped, delivered, cancelled, refunded
 * Estados de `payment_status`: pending, paid, failed, refunded, partially_refunded
 *
 * Uso:
 *   <StatusBadge kind="status" value={order.status} />
 *   <StatusBadge kind="payment" value={order.payment_status} />
 */

type Kind = "status" | "payment" | "fulfillment";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; fg: string; ring: string }
> = {
  // status
  pending: {
    label: "Pendiente",
    bg: "bg-[var(--color-earth-100)]",
    fg: "text-[var(--color-earth-700)]",
    ring: "ring-[var(--color-earth-100)]",
  },
  paid: {
    label: "Pagado",
    bg: "bg-[var(--color-leaf-100)]",
    fg: "text-[var(--color-leaf-700)]",
    ring: "ring-[var(--color-leaf-100)]",
  },
  processing: {
    label: "En preparación",
    bg: "bg-[#FFF1E0]",
    fg: "text-[#854F0B]",
    ring: "ring-[#F7DEC0]",
  },
  shipped: {
    label: "Enviado",
    bg: "bg-[#E6E2F5]",
    fg: "text-[var(--color-iris-700)]",
    ring: "ring-[#D4CDED]",
  },
  delivered: {
    label: "Entregado",
    bg: "bg-[var(--color-leaf-100)]",
    fg: "text-[var(--color-leaf-900)]",
    ring: "ring-[var(--color-leaf-700)]/30",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-[var(--color-earth-100)]",
    fg: "text-[var(--color-earth-700)]",
    ring: "ring-[var(--color-earth-100)]",
  },
  refunded: {
    label: "Reembolsado",
    bg: "bg-[var(--color-earth-100)]",
    fg: "text-[var(--color-earth-700)]",
    ring: "ring-[var(--color-earth-100)]",
  },
  // payment_status (sobrescribe algunos nombres)
  failed: {
    label: "Falló",
    bg: "bg-[#FBE7E2]",
    fg: "text-[#9A2A1F]",
    ring: "ring-[#F0CFC8]",
  },
  partially_refunded: {
    label: "Reembolso parcial",
    bg: "bg-[var(--color-earth-100)]",
    fg: "text-[var(--color-earth-700)]",
    ring: "ring-[var(--color-earth-100)]",
  },
  // fulfillment_status
  unfulfilled: {
    label: "Sin enviar",
    bg: "bg-[var(--color-earth-100)]",
    fg: "text-[var(--color-earth-700)]",
    ring: "ring-[var(--color-earth-100)]",
  },
  partial: {
    label: "Parcial",
    bg: "bg-[#FFF1E0]",
    fg: "text-[#854F0B]",
    ring: "ring-[#F7DEC0]",
  },
  fulfilled: {
    label: "Enviado",
    bg: "bg-[#E6E2F5]",
    fg: "text-[var(--color-iris-700)]",
    ring: "ring-[#D4CDED]",
  },
};

const PAYMENT_LABEL_OVERRIDE: Record<string, string> = {
  pending: "Pago pendiente",
  paid: "Pago confirmado",
  failed: "Pago rechazado",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
};

const FULFILLMENT_LABEL_OVERRIDE: Record<string, string> = {
  unfulfilled: "Sin despachar",
  partial: "Parcialmente despachado",
  fulfilled: "Despachado",
};

export function StatusBadge({
  kind = "status",
  value,
  className = "",
}: {
  kind?: Kind;
  value: string;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[value] ?? STATUS_CONFIG.pending;
  const label =
    kind === "payment"
      ? PAYMENT_LABEL_OVERRIDE[value] ?? cfg.label
      : kind === "fulfillment"
        ? FULFILLMENT_LABEL_OVERRIDE[value] ?? cfg.label
        : cfg.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider ring-1 ring-inset ${cfg.bg} ${cfg.fg} ${cfg.ring} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {label}
    </span>
  );
}
