type Props = {
  stock: number;
  trackStock: boolean;
};

/**
 * Indicador de disponibilidad. Decisión del producto:
 * solo dos estados visibles al cliente:
 *   - Disponible (verde)
 *   - Agotado (gris)
 *
 * Si el producto NO trackea stock (track_stock=false), siempre se considera disponible.
 * La numeración exacta se mantiene oculta al cliente final.
 */
export default function StockBadge({ stock, trackStock }: Props) {
  const isAvailable = !trackStock || stock > 0;

  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-leaf-500)]" aria-hidden />
        Disponible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-earth-100)] text-[var(--color-earth-700)] text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-earth-500)]" aria-hidden />
      Agotado
    </span>
  );
}
