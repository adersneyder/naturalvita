"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  badge?: number;
  /** Ruta aún no construida: se muestra deshabilitada con etiqueta. */
  comingSoon?: boolean;
};
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Bandeja de tareas", href: "/admin/tareas" },
      { label: "Pedidos", href: "/admin/pedidos" },
      { label: "Clientes", href: "/admin/clientes" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Productos", href: "/admin/productos" },
      { label: "Fuentes de datos", href: "/admin/fuentes" },
      { label: "Categorías", href: "/admin/categorias" },
      { label: "Sincronizar precios", href: "/admin/precios/sincronizar" },
      { label: "Inventario", href: "/admin/inventario", comingSoon: true },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Savia", href: "/admin/savia" },
      { label: "Sembrado", href: "/admin/sembrado" },
      { label: "Guías", href: "/admin/guias" },
      { label: "Cupones", href: "/admin/cupones" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Equipo", href: "/admin/usuarios" },
      { label: "Auditoría", href: "/admin/auditoria" },
      { label: "Configuración", href: "/admin/configuracion" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-white border-r border-[rgba(47,98,56,0.12)] py-5 px-3 flex-shrink-0 h-screen sticky top-0 overflow-y-auto">
      <Link href="/admin" className="block px-2 mb-5">
        <span className="font-serif text-base font-medium text-[var(--color-leaf-700)]">
          NaturalVita
        </span>
      </Link>

      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="text-[10px] text-[var(--color-earth-500)] uppercase tracking-wider font-medium mb-1.5 px-2">
            {group.title}
          </p>
          {group.items.map((item) => {
            // Rutas aún no construidas: se muestran deshabilitadas, sin link,
            // con etiqueta "Pronto". Evita 404 sin ocultar el roadmap.
            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] mb-0.5 text-[var(--color-earth-500)] cursor-default select-none"
                  aria-disabled="true"
                  title="Próximamente"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--color-earth-500)] opacity-30" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[9px] bg-[var(--color-earth-100)] text-[var(--color-earth-500)] px-1.5 py-0.5 rounded-lg font-medium uppercase tracking-wide">
                    Pronto
                  </span>
                </div>
              );
            }

            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)] font-medium"
                    : "text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-100)]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isActive
                      ? "bg-[var(--color-leaf-700)]"
                      : "bg-[var(--color-earth-500)] opacity-50"
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto text-[10px] bg-[#FAEEDA] text-[#854F0B] px-1.5 py-0.5 rounded-lg font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
