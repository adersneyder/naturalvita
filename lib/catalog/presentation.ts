/**
 * lib/catalog/presentation.ts
 *
 * Formateo uniforme de la presentación de un producto para mostrar al
 * público. Resuelve la inconsistencia del scraping: el campo `presentation`
 * llega como "60 units", "30 ml", "Gotas · 60ml", "907 g", "1 units", etc.,
 * y `presentation_type` como capsules/softgels/drops/powder/...
 *
 * Salida: una etiqueta legible y consistente, NUNCA un número suelto que
 * parezca "cantidad". Reglas:
 *   - Formas contables (cápsulas, softgels, tabletas): "60 softgels",
 *     "30 cápsulas" — el conteo va junto a la forma, se lee como presentación.
 *   - Formas líquidas/peso (gotas, jarabe, polvo): "Gotas · 60 ml",
 *     "Polvo · 907 g" — forma + tamaño.
 *   - Si solo hay tamaño o solo forma, se muestra lo que haya.
 *   - Si no hay nada, devuelve null (el caller no renderiza la línea).
 */

const FORM_LABELS: Record<string, string> = {
  capsules: "Cápsulas",
  softgels: "Softgels",
  tablets: "Tabletas",
  caplets: "Caplets",
  gummies: "Gomitas",
  chewables: "Masticables",
  sachets: "Sobres",
  drops: "Gotas",
  syrup: "Jarabe",
  liquid: "Líquido",
  suspension: "Suspensión",
  powder: "Polvo",
  cream: "Crema",
  gel: "Gel",
  ointment: "Ungüento",
  spray: "Spray",
  oil: "Aceite",
  lozenges: "Pastillas",
  tea: "Infusión",
};

// Formas donde el conteo ES la unidad natural ("60 softgels", "30 cápsulas").
const COUNTABLE_FORMS = new Set([
  "capsules",
  "softgels",
  "tablets",
  "caplets",
  "gummies",
  "chewables",
  "sachets",
  "lozenges",
]);

/** Singulariza la palabra de forma para conteo 1 ("1 cápsula"). */
function formAsUnit(type: string, count: number): string {
  const label = FORM_LABELS[type] ?? type;
  const lower = label.toLowerCase();
  if (count === 1) {
    // Singulares más comunes en español.
    if (lower === "cápsulas") return "cápsula";
    if (lower === "tabletas") return "tableta";
    if (lower === "gomitas") return "gomita";
    if (lower === "masticables") return "masticable";
    if (lower === "sobres") return "sobre";
    if (lower === "pastillas") return "pastilla";
    // softgels, caplets quedan igual.
    return lower;
  }
  return lower;
}

type ParsedSize = { value: number; unit: string } | null;

/**
 * Extrae el primer "número + unidad" de un string de presentación.
 * Normaliza unidades: units/unit -> unidades/unidad; ml/g/mg/oz/l se respetan.
 */
function parseSize(raw: string): ParsedSize {
  const m = raw.match(
    /(\d+(?:[.,]\d+)?)\s*(ml|l|mg|g|kg|oz|units?|unidad(?:es)?|caps?|softgels?|tab(?:s|letas)?)/i,
  );
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;

  let unit = m[2].toLowerCase();
  if (/^units?$/.test(unit) || /^unidad(es)?$/.test(unit)) {
    unit = value === 1 ? "unidad" : "unidades";
  } else if (/^caps?$/.test(unit)) {
    unit = "cápsulas";
  } else if (/^softgels?$/.test(unit)) {
    unit = "softgels";
  } else if (/^tab/.test(unit)) {
    unit = "tabletas";
  } else if (unit === "l") {
    unit = "L";
  }
  return { value, unit };
}

/**
 * Devuelve la presentación formateada o null si no hay información útil.
 */
export function formatPresentation(
  presentation: string | null | undefined,
  presentationType: string | null | undefined,
): string | null {
  const type = presentationType?.trim().toLowerCase() || null;
  const size = presentation ? parseSize(presentation) : null;

  // Forma contable + conteo numérico -> "60 softgels", "30 cápsulas".
  const isCountSize =
    size != null &&
    (size.unit === "unidades" ||
      size.unit === "unidad" ||
      size.unit === "cápsulas" ||
      size.unit === "softgels" ||
      size.unit === "tabletas");

  if (type && COUNTABLE_FORMS.has(type) && isCountSize) {
    return `${size!.value} ${formAsUnit(type, size!.value)}`;
  }

  const formLabel = type ? (FORM_LABELS[type] ?? null) : null;
  const sizeLabel = size ? `${size.value} ${size.unit}` : null;

  if (formLabel && sizeLabel) return `${formLabel} · ${sizeLabel}`;
  if (sizeLabel) return sizeLabel;
  if (formLabel) return formLabel;

  // Último recurso: si presentation traía texto no parseable pero existe,
  // lo devolvemos tal cual (mejor algo legible que nada), sin "units" crudo.
  if (presentation && presentation.trim()) {
    const cleaned = presentation
      .replace(/\bunits?\b/gi, "unidades")
      .trim();
    return cleaned || null;
  }
  return null;
}
