"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

type Props = {
  /** Valor inicial cuando estamos en /buscar?q=... y queremos prepoblar el input. */
  initialQuery?: string;
  /** Layout: "header" para el navbar (compacto), "page" para la página /buscar (ancho). */
  variant?: "header" | "page";
};

/**
 * Caja de búsqueda. Sin autocompletar todavía (eso queda para Nivel 2 con
 * algoritmo de "did you mean"). Hace submit a /buscar?q=...
 *
 * Comportamiento:
 *   - Submit con Enter o lupa.
 *   - Si q queda vacío al hacer submit, redirige a /buscar (página de tips).
 *   - En el header se expande de un icono a un input al hacer foco (mobile).
 */
export default function SearchBar({
  initialQuery = "",
  variant = "header",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [expanded, setExpanded] = useState(variant === "page");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && variant === "header") inputRef.current?.focus();
  }, [expanded, variant]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : "/buscar");
  }

  if (variant === "header" && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="p-2 rounded-lg text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
        aria-label="Abrir buscador"
      >
        <Search size={20} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={
        variant === "header"
          ? "flex items-center gap-1 bg-[var(--color-earth-50)] rounded-lg px-2 h-9 w-full max-w-xs"
          : "flex items-center gap-2 bg-white border border-[var(--color-earth-100)] rounded-xl px-3 h-12"
      }
      role="search"
    >
      <Search
        size={variant === "page" ? 20 : 16}
        className="text-[var(--color-earth-500)] shrink-0"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={
          variant === "page"
            ? "Buscar productos, ingredientes, beneficios..."
            : "Buscar..."
        }
        className={
          variant === "page"
            ? "flex-1 bg-transparent text-base text-[var(--color-leaf-900)] placeholder:text-[var(--color-earth-500)] focus:outline-none"
            : "flex-1 bg-transparent text-sm text-[var(--color-leaf-900)] placeholder:text-[var(--color-earth-500)] focus:outline-none"
        }
        aria-label="Buscar productos"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            inputRef.current?.focus();
          }}
          className="p-1 rounded text-[var(--color-earth-500)] hover:text-[var(--color-leaf-900)]"
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
      {variant === "header" && (
        <button
          type="button"
          onClick={() => {
            if (q.trim()) submit();
            else setExpanded(false);
          }}
          className="text-xs px-2 py-1 rounded text-[var(--color-iris-700)] font-medium"
        >
          {q.trim() ? "Buscar" : "Cerrar"}
        </button>
      )}
      {variant === "page" && (
        <button
          type="submit"
          className="ml-1 px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
        >
          Buscar
        </button>
      )}
    </form>
  );
}
