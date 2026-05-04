import Link from "next/link";

/**
 * Paginación tipo "página X de Y" con prev/next, agnóstica del shape de
 * searchParams. Reemplaza el ?page=X y conserva el resto de query.
 */
export default function AdminPagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(47,98,56,0.1)]"
    >
      <p className="text-xs text-[var(--color-earth-700)]">
        Página <span className="tabular-nums">{currentPage}</span> de{" "}
        <span className="tabular-nums">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildHref(prev)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.15)] bg-white hover:bg-[var(--color-earth-50)] text-[var(--color-leaf-900)]"
          >
            ← Anterior
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.1)] bg-[var(--color-earth-50)] text-[var(--color-earth-500)]">
            ← Anterior
          </span>
        )}
        {currentPage < totalPages ? (
          <Link
            href={buildHref(next)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.15)] bg-white hover:bg-[var(--color-earth-50)] text-[var(--color-leaf-900)]"
          >
            Siguiente →
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(47,98,56,0.1)] bg-[var(--color-earth-50)] text-[var(--color-earth-500)]">
            Siguiente →
          </span>
        )}
      </div>
    </nav>
  );
}
