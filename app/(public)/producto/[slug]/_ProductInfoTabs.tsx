"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MarkdownRenderer from "../../_components/MarkdownRenderer";

type Section = {
  id: string;
  label: string;
  content: string | null;
};

type Props = {
  fullDescription: string | null;
  compositionUse: string | null;
  dosage: string | null;
  warnings: string | null;
};

/**
 * Bloque de información detallada del producto.
 *
 * Estrategia:
 *   - Desktop (md+): tabs horizontales arriba, contenido del tab activo abajo.
 *     Patrón usado por Sephora, La Roche Posay, Natura, Loreal — el comprador
 *     ve la descripción primero (tab por defecto) y consulta composición o
 *     advertencias solo si tiene una restricción específica.
 *   - Mobile: accordion stack, descripción abierta por defecto, los demás
 *     colapsados. Tabs en mobile son frágiles (ancho insuficiente para
 *     etiquetas largas, scroll horizontal), accordion es el patrón estándar.
 *
 * Las secciones sin contenido se omiten — no renderizamos tab/header vacío.
 *
 * Tomamos `composition_use` como "Composición" porque el campo en BD mezcla
 * composición e ingredientes (decisión heredada del schema). Si el negocio
 * separa estos en el futuro, este componente se actualiza.
 */
export default function ProductInfoTabs({
  fullDescription,
  compositionUse,
  dosage,
  warnings,
}: Props) {
  const sections: Section[] = [
    { id: "descripcion", label: "Descripción", content: fullDescription },
    { id: "composicion", label: "Composición", content: compositionUse },
    { id: "modo-de-uso", label: "Modo de uso", content: dosage },
    { id: "advertencias", label: "Advertencias", content: warnings },
  ].filter((s) => s.content && s.content.trim().length > 0) as Section[];

  if (sections.length === 0) return null;

  return (
    <section className="mt-16">
      {/* MOBILE: accordion */}
      <div className="md:hidden">
        <h2 className="font-serif text-2xl text-[var(--color-leaf-900)] mb-4">
          Información del producto
        </h2>
        <ul className="border-t border-[var(--color-earth-100)]">
          {sections.map((s, idx) => (
            <AccordionItem
              key={s.id}
              section={s}
              defaultOpen={idx === 0}
            />
          ))}
        </ul>
      </div>

      {/* DESKTOP: tabs */}
      <div className="hidden md:block">
        <Tabs sections={sections} />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────

function Tabs({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0].id);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div>
      {/* Tab list */}
      <div
        className="flex gap-1 border-b border-[var(--color-earth-100)] -mx-1 overflow-x-auto"
        role="tablist"
        aria-label="Información del producto"
      >
        {sections.map((s) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${s.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(s.id)}
              onKeyDown={(e) => {
                // Navegación por flechas entre tabs (patrón ARIA)
                const idx = sections.findIndex((x) => x.id === activeId);
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setActiveId(sections[(idx + 1) % sections.length].id);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setActiveId(
                    sections[(idx - 1 + sections.length) % sections.length].id,
                  );
                }
              }}
              className={`relative px-4 lg:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "text-[var(--color-leaf-900)]"
                  : "text-[var(--color-earth-700)] hover:text-[var(--color-leaf-900)]"
              }`}
            >
              {s.label}
              {/* Subrayado del tab activo */}
              <span
                className={`absolute left-3 right-3 lg:left-4 lg:right-4 -bottom-px h-0.5 transition-colors ${
                  isActive ? "bg-[var(--color-iris-700)]" : "bg-transparent"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="pt-6 lg:pt-8 pb-2 max-w-3xl"
      >
        <MarkdownRenderer text={active.content as string} size="md" />
      </div>
    </div>
  );
}

function AccordionItem({
  section,
  defaultOpen,
}: {
  section: Section;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="border-b border-[var(--color-earth-100)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`acc-${section.id}`}
        className="w-full flex items-center justify-between py-4 text-left text-base font-medium text-[var(--color-leaf-900)]"
      >
        <span>{section.label}</span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`shrink-0 text-[var(--color-earth-700)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={`acc-${section.id}`} hidden={!open} className="pb-5">
        <MarkdownRenderer text={section.content as string} size="md" />
      </div>
    </li>
  );
}
