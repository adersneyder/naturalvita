import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";

type ConfigSection = {
  title: string;
  description: string;
  href: string;
  roles: string[];
  badge?: string;
};

const SECTIONS: ConfigSection[] = [
  {
    title: "Tarifas de impuesto",
    description: "Gestiona las tarifas de IVA (19%, 5%, excluido, exento) aplicables a productos",
    href: "/admin/configuracion/impuestos",
    roles: ["owner", "admin"],
  },
  {
    title: "Pasarela de pago",
    description: "Configura credenciales de Bold para procesar pagos en línea",
    href: "/admin/configuracion/pagos",
    roles: ["owner", "admin"],
    badge: "próximamente",
  },
  {
    title: "Envíos y zonas",
    description: "Define tarifas de envío por ciudad o región",
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
];

export default async function ConfiguracionPage() {
  const adminUser = await getAdminUser();

  const available = SECTIONS.filter((s) => s.roles.includes(adminUser.role));

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {available.map((section) => {
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
                {section.badge && (
                  <span className="text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {section.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-earth-700)] m-0">{section.description}</p>
            </Wrapper>
          );
        })}
      </div>
    </>
  );
}
