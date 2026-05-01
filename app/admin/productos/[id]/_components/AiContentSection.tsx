"use client";

import React, { useState, useTransition } from "react";

export type AiGeneratedFields = {
  short_description: string;
  full_description: string;
  composition_use: string;
  dosage: string;
  warnings: string;
};

type AiMetadata = {
  generated_at?: string;
  model?: string;
  template_id?: string;
  template_version?: string;
  regulatory_check_passed?: boolean;
  manual_edits_count?: number;
  last_edit_at?: string | null;
} | null;

type Props = {
  productId: string;
  current: AiGeneratedFields & { ai_metadata: AiMetadata };
};

type GenerateResponse = {
  status: "success" | "regulatory_failed" | "api_error" | "parse_error";
  template_id: string;
  model: string;
  output_parsed: AiGeneratedFields | null;
  regulatory: { passed: boolean; issues: string[]; details: Array<{ field: string; term: string; snippet: string }> } | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  error_message: string | null;
  applied: boolean;
};

const FIELD_LABELS: Record<keyof AiGeneratedFields, string> = {
  short_description: "Descripción corta",
  full_description: "Descripción completa",
  composition_use: "Composición y uso",
  dosage: "Modo de uso y posología",
  warnings: "Advertencias y contraindicaciones",
};

const FIELD_HINTS: Record<keyof AiGeneratedFields, string> = {
  short_description: "140-160 caracteres · meta description Google",
  full_description: "150-180 palabras · 2 párrafos",
  composition_use: "80-120 palabras · lista markdown",
  dosage: "30-60 palabras · 3 líneas",
  warnings: "70-110 palabras · incluye disclaimer regulatorio fijo",
};

/**
 * Renderer markdown ligero para previsualizar cómo se verá la ficha pública.
 * Soporta solo lo que necesitan nuestras 5 piezas editoriales:
 *   - **negrillas**
 *   - listas con guiones (- item)
 *   - párrafos separados por línea en blanco
 *
 * Cuando construyamos el catálogo público en /tienda usaremos un parser markdown
 * estándar (react-markdown). Por ahora este helper basta para que el admin
 * vea la ficha "como se publicará" en el editor.
 */
function MarkdownPreview({ text }: { text: string }) {
  if (!text) return <span className="text-[var(--color-earth-500)] italic">(vacío)</span>;

  // Convertir **bold** a <strong>
  const renderInline = (line: string): React.ReactNode[] => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Procesar línea por línea, agrupando bullets consecutivos en <ul>
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-0.5 my-1">
          {bulletBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      bulletBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("- ")) {
      bulletBuffer.push(line.slice(2));
    } else if (line === "") {
      flushBullets();
      // No insertar nodo: line breaks naturales por margen del siguiente bloque
    } else {
      flushBullets();
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-1 leading-snug">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();

  return <div>{blocks}</div>;
}

export default function AiContentSection({ productId, current }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiGeneratedFields | null>(null);
  const [metadata, setMetadata] = useState<{ template_id: string; model: string; cost: number; tokens: { input: number; output: number } } | null>(null);
  const [regulatoryIssues, setRegulatoryIssues] = useState<GenerateResponse["regulatory"] | null>(null);
  const [structuralIssue, setStructuralIssue] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // La detección de "ficha ya generada" se basa en ai_metadata (poblado solo por
  // applyContentToProduct), NO en short_description: esta columna viene del scraper
  // original para muchos productos y daría falso positivo.
  const hasGenerated = !!current.ai_metadata?.generated_at;
  const isStale = hasGenerated && current.ai_metadata?.template_version !== "v1";

  function generate() {
    setError(null);
    setDraft(null);
    setRegulatoryIssues(null);
    setStructuralIssue(null);

    startTransition(async () => {
      try {
        const resp = await fetch("/api/products/generate-ai-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", product_id: productId }),
        });

        const data: GenerateResponse = await resp.json();

        // api_error: el API de Anthropic falló. Sin draft posible.
        if (data.status === "api_error") {
          setError(data.error_message ?? "Error generando contenido");
          return;
        }

        // En cualquier otro caso (success, regulatory_failed, parse_error)
        // queremos guardar el draft si la IA logró producir algo parseable.
        // El admin verá los warnings y decidirá si aplicarlo o regenerar.
        if (data.output_parsed) {
          setDraft(data.output_parsed);
          setMetadata({
            template_id: data.template_id,
            model: data.model,
            cost: data.estimated_cost_usd,
            tokens: { input: data.input_tokens, output: data.output_tokens },
          });
        }

        if (data.status === "parse_error") {
          // Mostramos como aviso informativo, no como error rojo
          setStructuralIssue(data.error_message);
        }

        if (data.status === "regulatory_failed") {
          setRegulatoryIssues(data.regulatory);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de red");
      }
    });
  }

  function applyDraft() {
    if (!draft || !metadata) return;
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/products/generate-ai-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            product_id: productId,
            fields: draft,
            template_id: metadata.template_id,
            model: metadata.model,
            regulatory_check_passed: regulatoryIssues === null || regulatoryIssues.passed,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) {
          setError(data.error ?? "Error aplicando contenido");
          return;
        }
        setSavedFlash(true);
        setTimeout(() => {
          // Recargar la página para que el editor refleje los nuevos valores
          window.location.reload();
        }, 800);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de red");
      }
    });
  }

  function updateDraftField(field: keyof AiGeneratedFields, value: string) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  }

  return (
    <div className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-serif text-base font-medium text-[var(--color-leaf-900)] m-0">
            Contenido editorial · IA
          </h3>
          <p className="text-[11px] text-[var(--color-earth-700)] m-0 mt-0.5">
            5 campos generados con compliance regulatorio INVIMA según la categoría del producto.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="bg-[var(--color-leaf-700)] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-60 whitespace-nowrap"
        >
          {isPending && !draft ? "Generando..." : hasGenerated ? "Regenerar con IA" : "Generar con IA"}
        </button>
      </div>

      {/* Estado actual del producto */}
      {hasGenerated && !draft && !isPending && (
        <div className="mb-3 p-2 bg-[var(--color-leaf-100)] rounded-lg text-[11px] text-[var(--color-leaf-900)]">
          ✓ Ficha generada el{" "}
          {current.ai_metadata?.generated_at
            ? new Date(current.ai_metadata.generated_at).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—"}{" "}
          con {current.ai_metadata?.model ?? "—"}
          {isStale && (
            <span className="ml-2 text-[#854F0B]">· plantilla desactualizada, se recomienda regenerar</span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {structuralIssue && (
        <div className="mb-3 p-3 bg-[#E6F1FB] border border-[rgba(12,68,124,0.3)] rounded-lg">
          <p className="text-xs font-medium text-[#0C447C] m-0 mb-1">
            Aviso estructural
          </p>
          <p className="text-[10px] text-[#0C447C] m-0">
            {structuralIssue}
          </p>
          <p className="text-[10px] text-[#0C447C] m-0 mt-1">
            El contenido se muestra abajo. Puedes editarlo manualmente para ajustar longitud y
            aprobarlo, o regenerar para obtener una nueva propuesta.
          </p>
        </div>
      )}

      {regulatoryIssues && !regulatoryIssues.passed && (
        <div className="mb-3 p-3 bg-[#FAEEDA] border border-[rgba(133,79,11,0.3)] rounded-lg">
          <p className="text-xs font-medium text-[#854F0B] m-0 mb-1">
            ⚠ La IA usó términos prohibidos por la regulación INVIMA
          </p>
          <p className="text-[10px] text-[#854F0B] m-0 mb-2">
            Términos detectados: {regulatoryIssues.issues.join(", ")}
          </p>
          <p className="text-[10px] text-[#854F0B] m-0">
            Revisa los campos abajo, edita los términos problemáticos manualmente y aprueba. Si lo
            apruebas tal cual, el sistema marcará la ficha como &ldquo;requiere revisión legal&rdquo;.
          </p>
          {regulatoryIssues.details.length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] text-[#854F0B] cursor-pointer">
                Ver detalle por campo
              </summary>
              <ul className="text-[10px] text-[#854F0B] mt-1 ml-4 list-disc">
                {regulatoryIssues.details.map((d, i) => (
                  <li key={i}>
                    <strong>{FIELD_LABELS[d.field as keyof AiGeneratedFields] ?? d.field}</strong>:
                    {' "'}{d.term}{'" → '}
                    <em>...{d.snippet}...</em>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Si hay draft, mostrar editor de los 5 campos */}
      {draft && (
        <>
          {metadata && (
            <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-[var(--color-earth-700)]">
              <span>Plantilla: <code>{metadata.template_id}</code></span>
              <span>Modelo: <code>{metadata.model}</code></span>
              <span>Tokens: {metadata.tokens.input} in / {metadata.tokens.output} out</span>
              <span>Costo: ${metadata.cost.toFixed(4)} USD</span>
            </div>
          )}

          <div className="space-y-3">
            {(Object.keys(FIELD_LABELS) as Array<keyof AiGeneratedFields>).map((field) => {
              const value = draft[field] ?? "";
              const len = value.length;
              const wordCount = value.split(/\s+/).filter(Boolean).length;
              return (
                <div key={field}>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] font-medium text-[var(--color-earth-700)]">
                      {FIELD_LABELS[field]}
                    </label>
                    <span className="text-[10px] text-[var(--color-earth-500)]">
                      {FIELD_HINTS[field]} · actual: {len} chars / {wordCount} palabras
                    </span>
                  </div>
                  <textarea
                    value={value}
                    onChange={(e) => updateDraftField(field, e.target.value)}
                    rows={field === "short_description" ? 2 : field === "dosage" ? 3 : 6}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[rgba(47,98,56,0.15)] bg-white text-[var(--color-leaf-900)] focus:outline-none focus:border-[var(--color-leaf-500)] font-mono"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setRegulatoryIssues(null);
                setStructuralIssue(null);
                setMetadata(null);
              }}
              disabled={isPending}
              className="text-xs text-[var(--color-earth-700)] px-3 py-1.5 hover:bg-[var(--color-earth-100)] rounded-lg"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={applyDraft}
              disabled={isPending || savedFlash}
              className="bg-[var(--color-leaf-700)] text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-[var(--color-leaf-900)] disabled:opacity-60"
            >
              {savedFlash ? "✓ Guardado" : isPending ? "Guardando..." : "Aprobar y guardar"}
            </button>
          </div>
        </>
      )}

      {/* Mostrar valores actuales si NO hay draft (estado de solo lectura para revisar lo guardado) */}
      {!draft && hasGenerated && (
        <details className="mt-2" open>
          <summary className="text-[11px] text-[var(--color-earth-700)] cursor-pointer mb-2">
            Vista previa del contenido publicado
          </summary>
          <div className="space-y-3 text-[12px]">
            {(Object.keys(FIELD_LABELS) as Array<keyof AiGeneratedFields>).map((field) => (
              <div key={field}>
                <div className="font-medium text-[var(--color-earth-700)] mb-1 text-[10px] uppercase tracking-wide">
                  {FIELD_LABELS[field]}
                </div>
                <div className="text-[12px] text-[var(--color-leaf-900)] bg-[var(--color-earth-50)] p-3 rounded-lg leading-relaxed">
                  <MarkdownPreview text={current[field] ?? ""} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
