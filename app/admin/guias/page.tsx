import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUIAS_INDEX } from "@/lib/guias/registry";

export const dynamic = "force-dynamic";

/**
 * Listado admin de guías editoriales. Muestra las de BD (gestionables) y
 * las 5 fundacionales (TSX, solo lectura — se editan en código).
 */
export default async function AdminGuiasPage() {
  await getAdminUser();

  const admin = createAdminClient();
  const { data: dbGuides } = await admin
    .from("guides")
    .select("slug, title, status, published_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Guías editoriales
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            Artículos GEO que capturan tráfico de Google AI Overviews,
            ChatGPT y Perplexity.
          </p>
        </div>
        <Link
          href="/admin/guias/nueva"
          className="px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
        >
          Nueva guía con IA
        </Link>
      </header>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden mb-4">
        <header className="px-4 py-3 border-b border-[rgba(47,98,56,0.08)]">
          <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
            Creadas con el generador
          </h2>
        </header>
        {!dbGuides || dbGuides.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--color-earth-700)]">
            Aún no has creado guías con el generador. Las 5 fundacionales
            viven en código (abajo).
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
            {dbGuides.map((g) => (
              <li
                key={g.slug}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-[var(--color-leaf-900)] font-medium truncate m-0">
                    {g.title}
                  </p>
                  <p className="text-[11px] text-[var(--color-earth-500)] font-mono m-0 mt-0.5">
                    /guias/{g.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${
                      g.status === "published"
                        ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]"
                        : g.status === "draft"
                          ? "bg-[#FAEEDA] text-[#854F0B]"
                          : "bg-[var(--color-earth-100)] text-[var(--color-earth-500)]"
                    }`}
                  >
                    {g.status === "published"
                      ? "Publicada"
                      : g.status === "draft"
                        ? "Borrador"
                        : "Archivada"}
                  </span>
                  {g.status === "published" && (
                    <Link
                      href={`/guias/${g.slug}`}
                      target="_blank"
                      className="text-xs text-[var(--color-iris-700)] hover:underline"
                    >
                      Ver →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-hidden">
        <header className="px-4 py-3 border-b border-[rgba(47,98,56,0.08)]">
          <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
            Fundacionales (en código)
          </h2>
          <p className="text-[11px] text-[var(--color-earth-500)] mt-0.5 m-0">
            Se editan en el repositorio, no desde aquí.
          </p>
        </header>
        <ul className="divide-y divide-[rgba(47,98,56,0.06)]">
          {GUIAS_INDEX.map((g) => (
            <li
              key={g.slug}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="text-[var(--color-leaf-900)] font-medium truncate m-0">
                  {g.title}
                </p>
                <p className="text-[11px] text-[var(--color-earth-500)] font-mono m-0 mt-0.5">
                  /guias/{g.slug}
                </p>
              </div>
              <Link
                href={`/guias/${g.slug}`}
                target="_blank"
                className="text-xs text-[var(--color-iris-700)] hover:underline flex-shrink-0 ml-4"
              >
                Ver →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
