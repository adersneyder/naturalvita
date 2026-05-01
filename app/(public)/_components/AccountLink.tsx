"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Icono/link de cuenta en el header. Cambia según estado de auth:
 *   - Sin sesión: link a /iniciar-sesion (icono User)
 *   - Con sesión: link a /mi-cuenta (icono User con punto verde)
 *
 * Reactivo a cambios de auth (login/logout) via onAuthStateChange.
 *
 * Nota: este componente NO distingue entre admin y cliente. Si el dueño
 * del negocio está logueado en /admin y abre el público, verá "Mi cuenta"
 * apuntando a /mi-cuenta, lo cual está bien: puede operar como cliente
 * cuando quiere probar el flujo, y /admin sigue siendo la zona de trabajo.
 */
export default function AccountLink() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setAuthed(!!user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setAuthed(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Mientras carga, dejamos el icono neutro (no parpadeo de "Iniciar sesión")
  const href = authed === true ? "/mi-cuenta" : "/iniciar-sesion";
  const label =
    authed === true ? "Ir a mi cuenta" : "Iniciar sesión o crear cuenta";

  return (
    <Link
      href={href}
      className="relative p-2 rounded-lg text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
      aria-label={label}
      title={label}
    >
      <User size={20} strokeWidth={1.8} />
      {authed === true && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-leaf-500)]"
          aria-hidden
        />
      )}
    </Link>
  );
}
