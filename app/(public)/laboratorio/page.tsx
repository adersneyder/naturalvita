/**
 * app/(public)/laboratorio/page.tsx
 *
 * Página índice de Laboratorios aliados. Lista los laboratorios con
 * catálogo activo en el catálogo de NV, con:
 *   - Avatar de marca (iniciales en círculo de marca, porque por ahora
 *     logo_url está vacío en BD; cuando Ader suba logos, basta con
 *     reemplazar el avatar por <Image src={lab.logo_url} />)
 *   - Nombre del laboratorio
 *   - Descripción curada (datos verificados de fuentes oficiales y
 *     prensa colombiana, ver doc en cada entrada)
 *   - Badges con datos clave (ubicación, años de trayectoria,
 *     certificaciones)
 *   - Botón "Ver catálogo de [Lab]" → /laboratorio/[slug]
 *   - Link discreto al sitio oficial del lab
 *
 * Server component, estático. Si un lab nuevo cargara catálogo, aparece
 * solo al refrescar.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://naturalvita.co";

export const metadata: Metadata = {
  title: "Laboratorios aliados · NaturalVita",
  description:
    "Conoce los laboratorios colombianos que respaldan el catálogo de NaturalVita. Trayectoria, certificación INVIMA y productos curados para cada etapa de la vida.",
  alternates: { canonical: `${SITE_URL}/laboratorio` },
  openGraph: {
    title: "Laboratorios aliados · NaturalVita",
    description:
      "Conoce los laboratorios colombianos que respaldan nuestro catálogo.",
    url: `${SITE_URL}/laboratorio`,
    type: "website",
  },
};

// Revalida cada hora: el catálogo no cambia tan seguido pero esta página
// es server-rendered y debe reflejar nuevos labs si aparecen.
export const revalidate = 3600;

/**
 * Descripciones curadas de cada laboratorio. Datos verificados a partir
 * de sus sitios oficiales y prensa colombiana (junio 2026):
 *   - sistemanatural.com/quienes-somos/
 *   - cinatlaboratorios.com/nosotros/
 *   - naturfar.co/nosotros/
 *
 * Si Ader quiere editar estos textos en el futuro, lo más limpio es
 * mover esta tabla a la columna laboratories.description en BD y
 * leerla desde la consulta. Por ahora vive aquí para no añadir
 * migración solo por copy.
 */
const LAB_PROFILES: Record<
  string,
  {
    description: string;
    location: string;
    years: string;
    certifications: string;
    specialty: string;
  }
> = {
  millenium: {
    description:
      "Comercializa suplementos en Colombia desde 1999, con casi tres décadas acompañando a familias colombianas. Sus productos se fabrican en Florida (EE. UU.) bajo regulación de la FDA y cumplen INVIMA en Colombia.",
    location: "Distribuye en Colombia",
    years: "Desde 1999",
    certifications: "FDA + INVIMA",
    specialty: "Vitaminas, minerales y fórmulas naturales",
  },
  cinat: {
    description:
      "Laboratorio pionero del mercado naturista colombiano con más de veinte años de experiencia desarrollando productos de origen natural. Sus líneas comercial, médica y cosmética cubren desde aceites vegetales hasta fórmulas funcionales.",
    location: "Bogotá",
    years: "Más de 20 años",
    certifications: "INVIMA",
    specialty: "Aceites vegetales y fórmulas naturales",
  },
  naturfar: {
    description:
      "Compañía colombiana fundada en Medellín, con más de treinta años desarrollando productos fitoterapéuticos y suplementos dietarios. Cuenta con Certificación BPM del INVIMA desde 2008 y llega a más de 2.500 puntos de venta en el país.",
    location: "Medellín",
    years: "Más de 30 años",
    certifications: "BPM INVIMA (2008)",
    specialty: "Fitoterapéuticos y suplementos naturales",
  },
};

interface LabRow {
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  active_products: number;
}

async function getLabsWithCatalog(): Promise<LabRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("laboratories")
    .select(
      `slug, name, website_url, logo_url,
       products!inner(id, is_active, status)`,
    )
    .eq("is_active", true)
    .eq("products.is_active", true)
    .eq("products.status", "active");

  if (error) {
    console.error("[laboratorio/page] getLabsWithCatalog:", error.message);
    return [];
  }

  // Contar productos por lab y ordenar de mayor a menor.
  const counts = new Map<string, LabRow>();
  for (const row of data ?? []) {
    const r = row as unknown as {
      slug: string;
      name: string;
      website_url: string | null;
      logo_url: string | null;
      products: { id: string }[];
    };
    counts.set(r.slug, {
      slug: r.slug,
      name: r.name,
      website_url: r.website_url,
      logo_url: r.logo_url,
      active_products: r.products.length,
    });
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.active_products - a.active_products,
  );
}

/** Iniciales de la marca para el avatar (placeholder mientras no haya logo). */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Limpia la URL del sitio oficial para mostrarla sin protocolo ni path. */
function prettyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function LaboratoriosPage() {
  const labs = await getLabsWithCatalog();

  return (
    <main className="bg-[#FAF7F2]">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <p className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-leaf-700)] mb-4">
          <span aria-hidden className="inline-block w-7 h-[2px] rounded-full bg-[var(--color-leaf-700)]" />
          Nuestros aliados
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[var(--color-leaf-900)] leading-[1.08] tracking-[-0.02em] max-w-2xl">
          Laboratorios que respaldan tu bienestar
        </h1>
        <p className="mt-5 text-base sm:text-lg text-[var(--color-earth-700)] leading-relaxed max-w-2xl">
          Trabajamos con laboratorios colombianos y de marcas internacionales
          con presencia en Colombia, escogidos por su trayectoria, su
          cumplimiento sanitario y la calidad de sus productos. Cada producto
          que ves en NaturalVita pasa por nuestra curaduría antes de aparecer
          en el catálogo.
        </p>
      </section>

      {/* TARJETAS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 md:pb-28">
        <ul className="grid gap-6 md:gap-8">
          {labs.map((lab) => {
            const profile = LAB_PROFILES[lab.slug];
            return (
              <li
                key={lab.slug}
                className="bg-white border border-[#ECE4D4] rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_1px_2px_rgba(42,39,34,.03),0_8px_24px_rgba(42,39,34,.05)] hover:shadow-[0_4px_10px_rgba(42,39,34,.06),0_24px_48px_rgba(42,39,34,.10)] transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                  {/* Avatar / logo del lab */}
                  <div className="shrink-0">
                    {lab.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lab.logo_url}
                        alt={lab.name}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-contain bg-[#F5F1E8]"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--color-leaf-700)] to-[var(--color-leaf-900)] text-white flex items-center justify-center font-serif text-2xl md:text-3xl shadow-[0_8px_20px_rgba(30,125,46,.18)]">
                        {getInitials(lab.name)}
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                      <h2 className="font-serif text-2xl md:text-3xl text-[var(--color-leaf-900)] leading-tight">
                        {lab.name}
                      </h2>
                      <span className="text-sm text-[var(--color-earth-700)]">
                        {lab.active_products} producto
                        {lab.active_products !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {profile && (
                      <p className="text-[15px] text-[var(--color-earth-700)] leading-relaxed mb-5 max-w-2xl">
                        {profile.description}
                      </p>
                    )}

                    {/* Badges */}
                    {profile && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        <Badge>{profile.location}</Badge>
                        <Badge>{profile.years}</Badge>
                        <Badge>{profile.certifications}</Badge>
                        <Badge tone="soft">{profile.specialty}</Badge>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-4">
                      <Link
                        href={`/laboratorio/${lab.slug}`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-iris-700)] text-white text-sm font-semibold shadow-[0_1px_2px_rgba(74,46,154,.08),0_8px_24px_rgba(74,46,154,.20)] hover:shadow-[0_2px_4px_rgba(74,46,154,.10),0_16px_32px_rgba(74,46,154,.28)] hover:-translate-y-0.5 transition-all"
                      >
                        Ver catálogo de {lab.name.split(" ")[0]}
                        <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                      {lab.website_url && (
                        <a
                          href={lab.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-earth-700)] hover:text-[var(--color-iris-700)] underline underline-offset-4 decoration-[var(--color-earth-100)] hover:decoration-[var(--color-iris-700)] transition-colors"
                        >
                          {prettyDomain(lab.website_url)} ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Cierre con compromiso de curaduría */}
        <p className="mt-12 md:mt-16 max-w-2xl text-sm text-[var(--color-earth-700)] leading-relaxed italic">
          La lista crece a medida que sumamos laboratorios que pasan nuestra
          curaduría. Si fabricas o representas una marca natural confiable y
          quieres aparecer aquí, escríbenos a{" "}
          <a
            href="mailto:info@naturalvita.co"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            info@naturalvita.co
          </a>
          .
        </p>
      </section>
    </main>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "soft";
}) {
  const cls =
    tone === "soft"
      ? "bg-[#F0EBFA] text-[var(--color-iris-700)] border-[#E2D6F5]"
      : "bg-[#E5F1E7] text-[#1E5E34] border-[#CFE4D3]";
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${cls}`}
    >
      {children}
    </span>
  );
}
