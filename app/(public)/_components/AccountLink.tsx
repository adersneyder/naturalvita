"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ChevronDown, LogOut, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Acceso a cuenta en el header. Cambia según estado de auth:
 *   - Sin sesión: botón "Ingresar" → /iniciar-sesion (explícito, invita a entrar)
 *   - Con sesión: ícono User + nombre + menú desplegable con:
 *       · Mi cuenta  → /mi-cuenta
 *       · Cerrar sesión (signOut + redirect al Home)
 *
 * Reactivo a cambios de auth (login/logout) vía onAuthStateChange.
 * Detección client-side para no romper el cacheo estático del Home.
 *
 * Nombre a mostrar (cascada, sin penalizar a anónimos):
 *   1. user_metadata.full_name / name  (viene gratis en la sesión)
 *   2. customers.full_name             (lectura ligera por id, solo si hay sesión)
 *   3. parte local del email           (fallback final)
 *
 * Nota: NO distingue admin de cliente (igual que antes). El dueño logueado
 * en /admin que abra el público verá su acceso a /mi-cuenta, lo cual está
 * bien para probar el flujo de cliente.
 */
export default function AccountLink() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function resolveSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!user) {
        setAuthed(false);
        setDisplayName(null);
        return;
      }

      setAuthed(true);
      // 1. metadata (gratis)
      const meta = user.user_metadata as Record<string, unknown> | null;
      const metaName =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        null;

      if (metaName) {
        setDisplayName(firstName(metaName));
        return;
      }

      // 2. customers.full_name (lectura ligera por id)
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;

      if (customer?.full_name) {
        setDisplayName(firstName(customer.full_name));
        return;
      }

      // 3. parte local del email
      setDisplayName(user.email ? user.email.split("@")[0] : "Mi cuenta");
    }

    resolveSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (session?.user) {
        resolveSession();
      } else {
        setAuthed(false);
        setDisplayName(null);
        setMenuOpen(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Cerrar el menú al hacer click fuera o presionar Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  // --- Mientras carga: placeholder neutro (sin parpadeo) ---
  if (authed === null) {
    return (
      <div
        className="p-2 rounded-lg text-[var(--color-earth-700)]"
        aria-hidden
      >
        <User size={20} strokeWidth={1.8} />
      </div>
    );
  }

  // --- Sin sesión: botón "Ingresar" explícito ---
  if (authed === false) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-leaf-900)] hover:text-[var(--color-iris-700)] hover:bg-[var(--color-earth-50)] transition-colors"
        aria-label="Iniciar sesión o crear cuenta"
      >
        <User size={18} strokeWidth={1.8} />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    );
  }

  // --- Con sesión: ícono + nombre + menú desplegable ---
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-iris-700)]/30"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Menú de mi cuenta"
      >
        <span className="relative">
          <User size={20} strokeWidth={1.8} className="text-[var(--color-iris-700)]" />
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-leaf-500)]"
            aria-hidden
          />
        </span>
        {displayName && (
          <span className="hidden sm:inline max-w-[120px] truncate">
            {displayName}
          </span>
        )}
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`hidden sm:inline transition-transform ${menuOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-52 rounded-xl border border-[var(--color-earth-100)] bg-white shadow-lg py-1.5 z-50"
        >
          <Link
            href="/mi-cuenta"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] transition-colors"
          >
            <LayoutGrid size={16} strokeWidth={1.8} className="text-[var(--color-earth-700)]" />
            Mi cuenta
          </Link>
          <div className="my-1 border-t border-[var(--color-earth-100)]" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-earth-700)] hover:bg-[var(--color-earth-50)] hover:text-[var(--color-leaf-900)] transition-colors disabled:opacity-50"
          >
            <LogOut size={16} strokeWidth={1.8} />
            {signingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Toma el primer nombre de un nombre completo, capitalizado de forma simple. */
function firstName(full: string): string {
  const trimmed = full.trim();
  if (!trimmed) return "Mi cuenta";
  const first = trimmed.split(/\s+/)[0];
  // Si viene en MAYÚSCULAS (como "ADER"), lo dejamos en Title Case suave
  if (first === first.toUpperCase()) {
    return first.charAt(0) + first.slice(1).toLowerCase();
  }
  return first;
}
