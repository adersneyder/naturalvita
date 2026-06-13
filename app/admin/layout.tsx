import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-auth";
import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
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
