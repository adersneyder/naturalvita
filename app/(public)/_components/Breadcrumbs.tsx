import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

/**
 * Migas de pan accesibles. El último ítem nunca es link (la página actual).
 * Schema.org BreadcrumbList se incluye en cada página que lo use, no aquí
 * (los componentes de página son los que tienen el contexto SEO completo).
 */
export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Migas de pan" className="text-xs text-[var(--color-earth-700)]">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((crumb, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="hover:text-[var(--color-leaf-700)] hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--color-leaf-900)] font-medium" : ""}>
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-[var(--color-earth-500)]">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
