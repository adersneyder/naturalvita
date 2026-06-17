import Link from "next/link";
import { requireCapability } from "@/lib/admin-capabilities";
import { loadCapabilityMatrix } from "@/lib/admin-capabilities";
import CapabilityMatrix from "./_CapabilityMatrix";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  orders: "Pedidos",
  catalog: "Catálogo",
  marketing: "Marketing",
  system: "Sistema",
};

export default async function RolesPage() {
  await requireCapability("users.manage");
  const { capabilities, byRole } = await loadCapabilityMatrix();

  // Agrupar capabilities por category preservando el orden de inserción
  // del fetch (ya viene ordenado por category, code).
  const grouped = new Map<
    string,
    Array<{ code: string; category: string; description: string }>
  >();
  for (const cap of capabilities) {
    const list = grouped.get(cap.category) ?? [];
    list.push(cap);
    grouped.set(cap.category, list);
  }

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href="/admin/usuarios"
            className="text-xs text-[var(--color-iris-700)] hover:underline"
          >
            ← Equipo
          </Link>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
            Capacidades por rol
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {capabilities.length} capacidades · cada cambio queda registrado en
            auditoría
          </p>
        </div>
      </header>

      <CapabilityMatrix
        groups={Array.from(grouped.entries()).map(([category, caps]) => ({
          category,
          label: CATEGORY_LABELS[category] ?? category,
          capabilities: caps,
        }))}
        byRole={byRole}
      />

      <p className="text-[10px] text-[var(--color-earth-500)] mt-4">
        Owner es wildcard implícito y tiene acceso a todo — no aparece como
        columna porque no se edita. Los códigos de capacidad
        (<code>orders.cancel</code>, <code>catalog.publish</code>…) son
        contrato estable referenciado en el código TypeScript.
      </p>
    </>
  );
}
