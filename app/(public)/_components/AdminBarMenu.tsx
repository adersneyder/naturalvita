"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { setAdminBarVisibility } from "./admin-bar-actions";

/**
 * Menú del lado derecho de la AdminBar: dropdown con "Mi perfil",
 * "Ocultar barra" (cookie, recargable desde /admin/mi-perfil) y
 * "Cerrar sesión". Cliente porque maneja open/close + transición.
 */
export default function AdminBarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function hide() {
    startTransition(async () => {
      await setAdminBarVisibility(true);
      setOpen(false);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:text-[var(--color-leaf-100)] transition-colors flex items-center gap-1"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Opciones
        <span aria-hidden className="text-[9px]">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[180px] bg-white text-[var(--color-earth-900)] rounded-lg shadow-lg border border-[rgba(47,98,56,0.12)] py-1 text-xs"
        >
          <Link
            href="/admin/mi-perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-[var(--color-earth-50)]"
          >
            Mi perfil
          </Link>
          <Link
            href="/mi-cuenta"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-[var(--color-earth-50)]"
          >
            Mi cuenta como cliente
          </Link>
          <button
            type="button"
            onClick={hide}
            disabled={pending}
            role="menuitem"
            className="block w-full text-left px-3 py-2 hover:bg-[var(--color-earth-50)] disabled:opacity-50"
            title="Para volver a verla, entra a /admin/mi-perfil"
          >
            {pending ? "Ocultando…" : "Ocultar esta barra"}
          </button>
          <div className="h-px bg-[var(--color-earth-100)] my-1" />
          <Link
            href="/admin"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-[var(--color-earth-50)] font-medium text-[var(--color-leaf-700)]"
          >
            Panel admin →
          </Link>
        </div>
      )}
    </div>
  );
}
