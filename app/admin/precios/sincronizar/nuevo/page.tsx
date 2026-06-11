import Link from "next/link";
import { requireRole } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import NuevaSincForm from "./_NuevaSincForm";

export const dynamic = "force-dynamic";

/**
 * Step 1 del sincronizador: el admin selecciona el laboratorio del cual
 * viene la lista, adjunta el archivo (.xlsx o .csv) y sube. El servidor
 * parsea inline y redirige al detalle de la corrida creada.
 */
export default async function NuevaSyncPage() {
  await requireRole(["owner", "admin", "editor"]);
  const admin = createAdminClient();
  const { data: laboratories } = await admin
    .from("laboratories")
    .select("id, name")
    .order("name");

  return (
    <>
      <header className="mb-4">
        <Link
          href="/admin/precios/sincronizar"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          ← Historial
        </Link>
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0 mt-2">
          Nueva sincronización
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Selecciona el laboratorio y sube la lista de precios. Aceptamos
          .xlsx y .csv hasta 5 MB.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-xl">
        <NuevaSincForm laboratories={laboratories ?? []} />
      </div>

      <div className="mt-4 max-w-xl text-[11px] text-[var(--color-earth-700)] leading-relaxed">
        <p className="m-0 mb-1 font-medium text-[var(--color-leaf-900)]">
          Cómo lo procesamos
        </p>
        <p className="m-0">
          1. Detectamos automáticamente las columnas de producto, código y
          precio. Si no lo logramos, te avisamos qué encontramos.
        </p>
        <p className="m-0">
          2. Hacemos matching contra tu catálogo del mismo laboratorio. Los
          matches con alta confianza se preseleccionan; los demás los
          revisas tú antes de aplicar.
        </p>
        <p className="m-0">
          3. Solo actualizamos el costo (cost_cop) — el precio público lo
          decides tú producto a producto.
        </p>
      </div>
    </>
  );
}
