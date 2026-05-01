import { calculateDiscount, formatCop } from "@/lib/format/currency";

type Props = {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
};

/**
 * Muestra el precio del producto con descuento tachado opcional.
 * Tres tamaños:
 *   sm: para tarjetas en grilla (ProductCard)
 *   md: para tarjetas grandes en feature
 *   lg: para la página del producto (hero)
 */
export default function PriceTag({ price, compareAtPrice, size = "md" }: Props) {
  const discount = calculateDiscount(price, compareAtPrice);
  const hasDiscount = discount !== null;

  const sizeClasses = {
    sm: { current: "text-base", compare: "text-xs", badge: "text-[10px] px-1.5 py-0.5" },
    md: { current: "text-xl", compare: "text-sm", badge: "text-xs px-2 py-0.5" },
    lg: { current: "text-3xl", compare: "text-base", badge: "text-sm px-2.5 py-1" },
  }[size];

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span
        className={`${sizeClasses.current} font-medium text-[var(--color-leaf-900)] tabular-nums`}
      >
        {formatCop(price)}
      </span>
      {hasDiscount && (
        <>
          <span
            className={`${sizeClasses.compare} text-[var(--color-earth-500)] line-through tabular-nums`}
          >
            {formatCop(compareAtPrice ?? 0)}
          </span>
          <span
            className={`${sizeClasses.badge} bg-[var(--color-iris-100)] text-[var(--color-iris-700)] rounded-full font-medium`}
          >
            -{discount}%
          </span>
        </>
      )}
    </div>
  );
}
