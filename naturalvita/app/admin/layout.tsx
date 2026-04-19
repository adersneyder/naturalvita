import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!adminUser || !adminUser.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_authorized");
  }

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
