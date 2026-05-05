type Props = {
  rating: number;
  max?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
};

/**
 * Renderiza estrellas SVG para mostrar un rating.
 * Soporta medias estrellas (para promedios como 4.3).
 * Server component — sin estado, sin efectos.
 */
export default function StarRating({
  rating,
  max = 5,
  size = 16,
  showValue = false,
  className = "",
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={`${rating} de ${max} estrellas`}
    >
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {Array.from({ length: max }).map((_, i) => {
          const filled = rating >= i + 1;
          const half = !filled && rating > i;
          return (
            <svg
              key={i}
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {half ? (
                <>
                  <defs>
                    <linearGradient id={`half-${i}`}>
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#d1d5db" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                    fill={`url(#half-${i})`}
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                </>
              ) : (
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={filled ? "#f59e0b" : "#e5e7eb"}
                  stroke={filled ? "#f59e0b" : "#d1d5db"}
                  strokeWidth="1"
                />
              )}
            </svg>
          );
        })}
      </span>
      {showValue && (
        <span className="text-sm text-[var(--color-earth-700)] tabular-nums">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
