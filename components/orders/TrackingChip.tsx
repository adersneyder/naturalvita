import {
  buildTrackingUrl,
  getCarrierLabel,
} from "@/lib/shipping/carriers";

/**
 * Chip de tracking clickeable. Renderiza el número de guía + nombre de
 * transportadora como link cuando hay deep-link disponible, o como
 * display estático cuando no. Reutilizable en página detalle, listado,
 * panel admin, etc.
 *
 * Variants:
 *   - "card" (default): bloque destacado para detalle de pedido,
 *     visualmente prominente con bg leaf-100 y borde.
 *   - "inline": versión compacta para listados, una sola línea.
 *
 * Comportamiento:
 *   - Si carrier soporta deep-link Y hay número → todo el chip es <a>
 *     y abre tracking en nueva pestaña.
 *   - Si no hay deep-link (TCC, Domina, Otra) pero hay número → display
 *     estático con icono indicador para evitar falsa expectativa de click.
 *   - Si no hay número aún → "Guía pendiente" con texto suave.
 */
type Props = {
  trackingNumber: string | null;
  shippingCarrier: string | null;
  variant?: "card" | "inline";
};

export function TrackingChip({
  trackingNumber,
  shippingCarrier,
  variant = "card",
}: Props) {
  const carrierLabel = getCarrierLabel(shippingCarrier);
  const deepLink = buildTrackingUrl(shippingCarrier, trackingNumber);
  const hasNumber = Boolean(trackingNumber?.trim());

  // Sin transportadora ni guía: nada que mostrar
  if (!carrierLabel && !hasNumber) return null;

  if (variant === "inline") {
    return <InlineChip
      trackingNumber={trackingNumber}
      carrierLabel={carrierLabel}
      deepLink={deepLink}
      hasNumber={hasNumber}
    />;
  }

  return <CardChip
    trackingNumber={trackingNumber}
    carrierLabel={carrierLabel}
    deepLink={deepLink}
    hasNumber={hasNumber}
  />;
}

/* -------------------------------------------------------------------------- */
/*  Variant: card                                                             */
/* -------------------------------------------------------------------------- */

function CardChip({
  trackingNumber,
  carrierLabel,
  deepLink,
  hasNumber,
}: {
  trackingNumber: string | null;
  carrierLabel: string | null;
  deepLink: string | null;
  hasNumber: boolean;
}) {
  const innerContent = (
    <>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
            Número de guía
          </p>
          {hasNumber ? (
            <p className="font-mono text-base text-[var(--color-leaf-900)] mt-1 break-all">
              {trackingNumber}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-earth-500)] mt-1 italic">
              Guía pendiente de actualizar
            </p>
          )}
        </div>
        {carrierLabel && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-earth-700)]">
              Transportadora
            </p>
            <p className="text-sm text-[var(--color-leaf-900)] mt-1">
              {carrierLabel}
            </p>
          </div>
        )}
      </div>
      {deepLink && (
        <p className="mt-3 text-[12px] text-[var(--color-iris-700)] flex items-center gap-1.5 font-medium">
          Click para rastrear con {carrierLabel}
          <span aria-hidden>↗</span>
        </p>
      )}
      {!deepLink && hasNumber && carrierLabel && (
        <p className="mt-3 text-[12px] text-[var(--color-earth-700)] leading-relaxed">
          Copia el número y búscalo en la página de {carrierLabel}.
        </p>
      )}
    </>
  );

  // Si hay deep-link, todo el card es clickeable (toda la zona)
  if (deepLink) {
    return (
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-[var(--color-leaf-100)]/50 border border-[var(--color-leaf-700)]/15 rounded-xl p-4 hover:bg-[var(--color-leaf-100)] hover:border-[var(--color-leaf-700)]/30 transition-colors group focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/30"
        aria-label={`Rastrear envío con ${carrierLabel}`}
      >
        {innerContent}
      </a>
    );
  }

  // Sin deep-link: solo display estático
  return (
    <div className="bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] rounded-xl p-4">
      {innerContent}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Variant: inline                                                           */
/* -------------------------------------------------------------------------- */

function InlineChip({
  trackingNumber,
  carrierLabel,
  deepLink,
  hasNumber,
}: {
  trackingNumber: string | null;
  carrierLabel: string | null;
  deepLink: string | null;
  hasNumber: boolean;
}) {
  if (!hasNumber) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-earth-500)] italic">
        {carrierLabel
          ? `${carrierLabel} · guía pendiente`
          : "Guía pendiente"}
      </span>
    );
  }

  const content = (
    <>
      <span className="font-mono">{trackingNumber}</span>
      {carrierLabel && (
        <span className="text-[var(--color-earth-700)] font-sans">
          · {carrierLabel}
        </span>
      )}
      {deepLink && (
        <span aria-hidden className="text-[var(--color-iris-700)]">
          ↗
        </span>
      )}
    </>
  );

  if (deepLink) {
    return (
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-[11px] text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-iris-700)]/30 rounded"
        aria-label={`Rastrear con ${carrierLabel}`}
      >
        {content}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-earth-700)]">
      {content}
    </span>
  );
}
