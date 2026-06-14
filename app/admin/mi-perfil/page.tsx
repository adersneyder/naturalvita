import { getAdminUser } from "@/lib/admin-auth";
import ChangePasswordSection from "@/components/auth/ChangePasswordSection";
import { isAdminBarHidden } from "@/app/(public)/_components/admin-bar-actions";
import AdminBarToggle from "./_AdminBarToggle";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  cashier: "Caja",
  warehouse: "Bodega",
};

/**
 * /admin/mi-perfil — datos del miembro del equipo y cambio de contraseña.
 * Sin gestión de "Mis datos" (los campos de cliente no aplican al equipo).
 * El cambio de rol vive en /admin/usuarios (próxima pasada) — el propio
 * usuario no puede cambiar su rol.
 */
export default async function MiPerfilPage() {
  const adminUser = await getAdminUser();
  const adminBarHidden = await isAdminBarHidden();

  return (
    <>
      <header className="mb-4">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Mi perfil
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Datos de tu cuenta del equipo. Tu rol lo administra un owner.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-xl mb-4">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-3">
          Datos
        </h2>
        <dl className="grid grid-cols-3 gap-y-2 text-xs">
          <dt className="text-[var(--color-earth-500)]">Nombre</dt>
          <dd className="col-span-2 m-0 text-[var(--color-earth-900)]">
            {adminUser.full_name ?? "—"}
          </dd>
          <dt className="text-[var(--color-earth-500)]">Correo</dt>
          <dd className="col-span-2 m-0 text-[var(--color-earth-900)] font-mono">
            {adminUser.email}
          </dd>
          <dt className="text-[var(--color-earth-500)]">Rol</dt>
          <dd className="col-span-2 m-0">
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)]">
              {ROLE_LABELS[adminUser.role] ?? adminUser.role}
            </span>
          </dd>
        </dl>
      </section>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-xl mb-4">
        <AdminBarToggle hidden={adminBarHidden} />
      </section>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 max-w-xl">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-2">
          Cambiar contraseña
        </h2>
        <p className="text-xs text-[var(--color-earth-700)] mt-0 mb-3">
          Si entraste con un enlace de correo, aquí puedes crear tu
          contraseña por primera vez para entrar más rápido.
        </p>
        <ChangePasswordSection />
      </section>
    </>
  );
}
