import Link from "next/link";
import { requireCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteForm from "./_InviteForm";
import UserRow from "./_UserRow";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  cashier: "Caja",
  warehouse: "Bodega",
};

export default async function UsuariosPage() {
  const actor = await requireCapability("users.manage");

  const admin = createAdminClient();
  const [{ data: users }, { data: invitations }] = await Promise.all([
    admin
      .from("admin_users")
      .select("id, email, full_name, role, is_active, created_at, last_login_at")
      .order("created_at", { ascending: false }),
    admin
      .from("admin_invitations")
      .select("email, role, full_name, invited_at, status, expires_at")
      .eq("status", "sent")
      .order("invited_at", { ascending: false }),
  ]);

  const list = users ?? [];
  const total = list.length;
  const active = list.filter((u) => u.is_active).length;
  const pending = (invitations ?? []).filter((i) => {
    return !list.some((u) => u.email.toLowerCase() === i.email.toLowerCase());
  });

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
            Equipo
          </h1>
          <p className="text-xs text-[var(--color-earth-700)] mt-1">
            {total} usuarios · {active} activos · {pending.length} invitaciones pendientes
          </p>
        </div>
        <Link
          href="/admin/usuarios/roles"
          className="text-xs text-[var(--color-iris-700)] hover:underline"
        >
          Editar capacidades por rol →
        </Link>
      </header>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-5 mb-4 max-w-3xl">
        <h2 className="font-serif text-base text-[var(--color-leaf-900)] m-0 mb-1">
          Invitar
        </h2>
        <p className="text-xs text-[var(--color-earth-700)] m-0 mb-3">
          Le enviamos un enlace de acceso a su correo. Define la contraseña al
          entrar a Mi perfil.
        </p>
        <InviteForm />
      </section>

      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] overflow-x-auto">
        {list.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--color-earth-700)]">
            Aún no hay miembros del equipo.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(47,98,56,0.1)]">
                <Th>Miembro</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Último acceso</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(47,98,56,0.06)]">
              {list.map((u) => (
                <UserRow
                  key={u.id}
                  user={{
                    id: u.id,
                    email: u.email,
                    full_name: u.full_name,
                    role: u.role,
                    is_active: u.is_active,
                    last_login_at: u.last_login_at,
                  }}
                  isSelf={u.id === actor.id}
                  roleLabels={ROLE_LABELS}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-4 bg-[#FAEEDA]/30 border border-[#854F0B]/15 rounded-xl p-4">
          <h2 className="font-serif text-base text-[#854F0B] m-0 mb-2">
            Invitaciones sin aceptar
          </h2>
          <ul className="space-y-1 m-0 p-0 list-none text-xs">
            {pending.map((i) => (
              <li key={i.email} className="flex items-center justify-between gap-3">
                <span className="text-[var(--color-earth-900)]">
                  {i.full_name}{" "}
                  <span className="text-[var(--color-earth-500)]">({i.email})</span>
                </span>
                <span className="text-[10px] text-[var(--color-earth-500)] tabular-nums">
                  invitado el{" "}
                  {new Date(i.invited_at).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-3 py-2 text-[10px] uppercase tracking-wider font-medium text-[var(--color-earth-500)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
