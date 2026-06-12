import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getAdminUser } from "@/lib/admin-auth";
import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // /admin/login es la única página bajo /admin que NO requiere sesión —
  // la usamos para conseguir la sesión. Saltamos el check y renderizamos
  // el form sin chrome (sin sidebar/topbar).
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const adminUser = await getAdminUser();

  return (
    <div className="flex min-h-screen bg-[var(--color-earth-50)]">
      <Sidebar />
      <main className="flex-1 px-6 py-5 overflow-x-hidden">
        <Topbar
          userName={adminUser.full_name ?? adminUser.email}
          userEmail={adminUser.email}
        />
        {children}
      </main>
    </div>
  );
}
