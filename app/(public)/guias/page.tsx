import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Breadcrumbs from "../_components/Breadcrumbs";
import { GUIAS_INDEX } from "@/lib/guias/registry";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Guías editoriales · suplementos y bienestar en Colombia",
  description:
    "Guías prácticas sobre suplementos, vitaminas y productos naturales en Colombia. Cómo elegir, qué buscar, cuándo tomar. Basadas en evidencia y registro INVIMA.",
  alternates: { canonical: `${COMPANY.url}/guias` },
  openGraph: {
    title: "Guías editoriales · NaturalVita",
    description:
      "Cómo elegir suplementos en Colombia: criterios, dosis, INVIMA y opciones del catálogo.",
    url: `${COMPANY.url}/guias`,
    type: "website",
  },
};

export const revalidate = 86400; // 1 día

export default function GuiasIndexPage() {
  const guias = [...GUIAS_INDEX].sort((a, b) =>
    b.publishedDate.localeCompare(a.publishedDate),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Guías" }]} />

      <header className="mt-6 mb-10 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-iris-700)] font-medium mb-3">
          Editorial
        </p>
        <h1 className="font-serif text-3xl md:text-5xl text-[var(--color-leaf-900)] tracking-tight leading-[1.1]">
          Guías de NaturalVita
        </h1>
        <p className="mt-4 text-base md:text-lg text-[var(--color-earth-700)] leading-relaxed">
          Cómo elegir suplementos en Colombia. Criterios, dosis, qué exigir al
          comprar y opciones del catálogo con registro INVIMA verificable.
        </p>
      </header>

      <ul className="grid md:grid-cols-2 gap-6">
        {guias.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guias/${g.slug}`}
              className="group block rounded-2xl overflow-hidden bg-white border border-[var(--color-earth-100)] hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[16/9] bg-[var(--color-earth-50)] overflow-hidden">
                <Image
                  src={g.heroImage.url}
                  alt={g.heroImage.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-earth-500)] font-medium">
                  {g.readingTime}
                </p>
                <h2 className="font-serif text-xl text-[var(--color-leaf-900)] leading-tight mt-2 group-hover:text-[var(--color-iris-700)] transition-colors">
                  {g.title}
                </h2>
                <p className="text-sm text-[var(--color-earth-700)] leading-relaxed mt-2 line-clamp-3">
                  {g.dek}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
