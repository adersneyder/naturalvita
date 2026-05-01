import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  /**
   * Función que produce el href para una página dada.
   * La página la inyecta el padre que conoce los searchParams completos.
   */
  hrefFor: (page: number) => string;
};

/**
 * Paginación accesible. Muestra:
 *   - Botón "anterior"
 *   - Páginas: primera, última, página actual y vecinos
 *   - Botón "siguiente"
 *
 * Todos los enlaces son links reales (preservan querystring de filtros).
 */
export default function Pagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;

  const visible = computeVisiblePages(page, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-10"
      aria-label="Paginación de resultados"
    >
      <PageLink
        href={hrefFor(Math.max(1, page - 1))}
        disabled={page === 1}
        ariaLabel="Página anterior"
      >
        ‹
      </PageLink>

      {visible.map((p, i) =>
        p === "..." ? (
          <span
            key={`gap-${i}`}
            className="px-2 text-sm text-[var(--color-earth-500)]"
            aria-hidden
          >
            …
          </span>
        ) : (
          <PageLink
            key={p}
            href={hrefFor(p)}
            current={p === page}
            ariaLabel={`Ir a página ${p}`}
          >
            {p}
          </PageLink>
        ),
      )}

      <PageLink
        href={hrefFor(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        ariaLabel="Página siguiente"
      >
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current,
  disabled,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const base =
    "min-w-[36px] h-9 px-3 rounded-md text-sm font-medium tabular-nums flex items-center justify-center transition-colors";
  if (disabled) {
    return (
      <span
        className={`${base} text-[var(--color-earth-300)] cursor-not-allowed`}
        aria-disabled
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }
  if (current) {
    return (
      <span
        className={`${base} bg-[var(--color-iris-700)] text-white`}
        aria-current="page"
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]`}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

function computeVisiblePages(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "..."> = [1];
  if (current > 3) out.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) out.push(p);
  if (current < total - 2) out.push("...");
  out.push(total);
  return out;
}
