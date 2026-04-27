import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

type ConfigSection = {
  title: string;
  description: string;
  href: string;
  roles: string[];
  badge?: string;
  count?: number;
};

type SectionGroup = {
  title: string;
  description: string;
  sections: ConfigSection[];
};

export default async function ConfiguracionPage() {
  const adminUser = await getAdminUser();
  const supabase = await createClient();

  // Conteos en paralelo
  const [
    categoriesCount,
    collectionsCount,
    attributesCount,
    presentationsCount,
    unitsCount,
    laboratoriesCount,
    taxRatesCount,
  ] = await Promise.all([
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("collections").select("*", { count: "exact", head: true }),
    supabase.from("product_attributes").select("*", { count: "exact", head: true }),
    supabase.from("presentation_types").select("*", { count: "exact", head: true }),
    supabase.from("content_units").select("*", { count: "exact", head: true }),
    supabase.from("laboratories").select("*", { count: "exact", head: true }),
    supabase.from("tax_rates").select("*", { count: "exact", head: true }),
  ]);

  const groups: SectionGroup[] = [
    {
      title: "Catálogo",
      description: "Estructura, taxonomía y proveedores de los productos",
      sections: [
        {
          title: "Categorías",
          description: "Árbol jerárquico de categorías para navegación del catálogo",
          href: "/admin/categorias",
          roles: ["owner", "admin", "editor"],
          count: categoriesCount.count ?? 0,
        },
        {
          title: "Colecciones",
          description: "Agrupaciones temáticas (más vendidos, ofertas) para marketing y SEO",
          href: "/admin/configuracion/colecciones",
          roles: ["owner", "admin", "editor"],
          count: collectionsCount.count ?? 0,
        },
        {
          title: "Atributos",
          description: "Filtros del catálogo: sabor, certificaciones, propiedades",
          href: "/admin/configuracion/atributos",
          roles: ["owner", "admin", "editor"],
          count: attributesCount.count ?? 0,
        },
        {
          title: "Tipos de presentación",
          description: "Cómo se presenta el producto: cápsulas, polvo, gotas, líquido",
          href: "/admin/configuracion/presentaciones",
          roles: ["owner", "admin"],
          count: presentationsCount.count ?? 0,
        },
        {
          title: "Unidades de contenido",
          description: "Unidades de medida del contenido: g, ml, cápsulas",
          href: "/admin/configuracion/unidades",
          roles: ["owner", "admin"],
          count: unitsCount.count ?? 0,
        },
        {
          title: "Laboratorios",
          description: "Proveedores de los productos. Cada uno con su website y URL de catálogo",
          href: "/admin/configuracion/laboratorios",
          roles: ["owner", "admin", "editor"],
          count: laboratoriesCount.count ?? 0,
        },
        {
          title: "Tarifas de IVA",
          description: "Tarifas de impuesto (19%, 5%, excluido, exento) aplicables a productos",
          href: "/admin/configuracion/impuestos",
          roles: ["owner", "admin"],
          count: taxRatesCount.count ?? 0,
        },
      ],
    },
    {
      title: "Comercial",
      description: "Pagos, envíos y datos legales de la operación",
      sections: [
        {
          title: "Pasarela de pago",
          description: "Credenciales de Bold para procesar pagos en línea",
          href: "/admin/configuracion/pagos",
          roles: ["owner", "admin"],
          badge: "próximamente",
        },
        {
          title: "Envíos y zonas",
          description: "Tarifas de envío por ciudad o región",
          href: "/admin/configuracion/envios",
          roles: ["owner", "admin"],
          badge: "próximamente",
        },
        {
          title: "Datos de la empresa",
          description: "Razón social, NIT, dirección, contacto para facturación",
          href: "/admin/configuracion/empresa",
          roles: ["owner", "admin"],
          badge: "próximamente",
        },
      ],
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Configuración
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1 m-0">
          Ajustes globales de la tienda
        </p>
      </div>

      {groups.map((group) => {
        const visible = group.sections.filter((s) => s.roles.includes(adminUser.role));
        if (visible.length === 0) return null;

        return (
          <div key={group.title} className="mb-8">
            <div className="mb-3">
              <h2 className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-earth-700)] m-0">
                {group.title}
              </h2>
              <p className="text-[11px] text-[var(--color-earth-500)] m-0 mt-0.5">
                {group.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map((section) => {
                const isComingSoon = !!section.badge;
                const Wrapper = isComingSoon ? "div" : Link;
                const wrapperProps = isComingSoon ? {} : { href: section.href };

                return (
                  <Wrapper
                    key={section.href}
                    {...(wrapperProps as { href: string })}
                    className={`block bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4 transition-colors ${
                      isComingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-[var(--color-leaf-500)] hover:bg-[var(--color-earth-50)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
                        {section.title}
                      </p>
                      {section.badge ? (
                        <span className="text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {section.badge}
                        </span>
                      ) : section.count !== undefined ? (
                        <span className="text-[10px] font-medium bg-[var(--color-earth-100)] text-[var(--color-earth-700)] px-2 py-0.5 rounded-full">
                          {section.count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--color-earth-700)] m-0">
                      {section.description}
                    </p>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
