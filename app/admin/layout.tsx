import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-auth";
import { roleHasCapability } from "@/lib/admin-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const adminUser = await getAdminUser();

  // Conteo inicial de conversaciones escaladas sin atender, para el badge
  // del sidebar. Solo si el usuario puede responder chats. El badge se
  // mantiene actualizado en tiempo real via Realtime dentro del Sidebar.
  let escalatedCount = 0;
  const canChat = await roleHasCapability(adminUser.role, "chat.respond");
  if (canChat) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("chat_conversations")
      .select("*", { count: "exact", head: true })
      .eq("status", "escalated");
    escalatedCount = count ?? 0;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-earth-50)]">
      <Sidebar
        escalatedCount={escalatedCount}
        canWatchChat={canChat}
      />
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
