import "server-only";
import ExcelJS from "exceljs";
import type { ParsedLine } from "./types";

/**
 * Heurísticas para detectar la columna de cada campo. Los proveedores
 * usan nombres de columna distintos ("Producto", "Nombre", "Descripción";
 * "Precio", "Precio Distribuidor", "Costo"; "SKU", "Código", "Ref").
 *
 * Las regex se evalúan en orden y se queda con la PRIMERA columna que
 * matchee. El admin puede luego corregir manualmente desde la UI si el
 * parser eligió mal.
 */
const COLUMN_PATTERNS = {
  name: [
    /\bproducto\b/i,
    /\bdescrip/i,
    /\bnombre\b/i,
    /\bdetalle\b/i,
    /\bitem\b/i,
  ],
  sku: [
    /\bcódigo\b/i,
    /\bcodigo\b/i,
    /\bsku\b/i,
    /\bref(?:erencia)?\b/i,
    /\bcod\.?\b/i,
  ],
  price: [
    /precio.*(distribuidor|mayori|costo)/i,
    /\bcosto\b/i,
    /precio.*neto/i,
    /\bvalor\b/i,
    /\bprecio\b/i,
  ],
};

type ColumnMap = {
  name: number | null;
  sku: number | null;
  price: number | null;
};

/**
 * Encuentra los índices de columna leyendo la primera fila no vacía como
 * cabecera. Si no encuentra una columna obligatoria (name o price) tira
 * error que el admin verá en la UI.
 */
function findColumns(headers: string[]): ColumnMap {
  const result: ColumnMap = { name: null, sku: null, price: null };
  for (const field of ["name", "sku", "price"] as const) {
    for (const pattern of COLUMN_PATTERNS[field]) {
      const idx = headers.findIndex((h) => pattern.test(h ?? ""));
      if (idx >= 0) {
        result[field] = idx;
        break;
      }
    }
  }
  return result;
}

/**
 * Convierte un valor de celda en COP. Acepta:
 *   - números directos
 *   - strings con separador de miles ("12.500", "12,500")
 *   - strings con "$" o " COP"
 *   - decimales en COP los redondea (los precios en COP son enteros)
 */
function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\$/g, "")
    .replace(/COP/gi, "")
    .replace(/\s/g, "")
    // Quita SOLO el separador de miles, no el decimal. En COP los
    // proveedores rara vez tienen decimales, pero por si acaso: si hay
    // exactamente un punto/coma y le siguen 1-2 dígitos, lo trata como
    // decimal; si no, lo trata como miles.
    .replace(/[.,](?=\d{3}(?:[.,]|$))/g, "");
  const cleanedFinal = cleaned.replace(",", ".");
  const num = Number(cleanedFinal);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num);
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text ?? "");
  }
  return String(value);
}

/**
 * Parsea un Excel (xlsx) desde un Buffer. Lee la PRIMERA hoja y asume
 * que la primera fila no vacía es cabecera.
 */
export async function parseXlsx(buffer: Buffer): Promise<ParsedLine[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("El archivo no contiene hojas");

  // Buscamos la primera fila con al menos 2 celdas no vacías — esa es la
  // cabecera. Filas previas suelen ser título del documento, fecha, logo.
  let headerRow = -1;
  const maxScan = Math.min(sheet.rowCount, 15);
  for (let i = 1; i <= maxScan; i++) {
    const row = sheet.getRow(i);
    const nonEmpty = row.values
      ? (row.values as unknown[]).filter(
          (v) => v !== null && v !== undefined && v !== "",
        ).length
      : 0;
    if (nonEmpty >= 2) {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) throw new Error("No encontramos cabecera en el archivo");

  const headerVals = sheet.getRow(headerRow).values as unknown[];
  // ExcelJS row.values es 1-indexed (índice 0 viene null).
  const headers = headerVals.slice(1).map(asString);
  const cols = findColumns(headers);

  if (cols.name === null) {
    throw new Error(
      `No encontramos columna de producto. Esperábamos algo como "Producto" o "Descripción". Encontramos: ${headers.join(", ")}`,
    );
  }
  if (cols.price === null) {
    throw new Error(
      `No encontramos columna de precio. Esperábamos algo como "Precio" o "Costo". Encontramos: ${headers.join(", ")}`,
    );
  }

  const lines: ParsedLine[] = [];
  for (let i = headerRow + 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const values = (row.values as unknown[]).slice(1);

    const name = asString(values[cols.name]).trim();
    const sku = cols.sku !== null ? asString(values[cols.sku]).trim() : "";
    const price = parsePrice(values[cols.price]);

    // Saltamos filas vacías (separadores, totales, etc.).
    if (!name || price === null) continue;

    const raw: Record<string, string | number> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const v = values[idx];
      if (typeof v === "number") raw[h] = v;
      else raw[h] = asString(v);
    });

    lines.push({
      index: lines.length,
      supplier_name: name,
      supplier_sku: sku || null,
      price_cop: price,
      raw,
    });
  }

  return lines;
}

/**
 * Parsea un CSV. Soporta separador `,` o `;` (común en exports desde
 * Excel en español). Asume UTF-8 con o sin BOM.
 */
export function parseCsv(text: string): ParsedLine[] {
  // Quitamos BOM si viene.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = splitCsvRows(clean);
  if (rows.length === 0) throw new Error("CSV vacío");

  const headers = rows[0].map((h) => h.trim());
  const cols = findColumns(headers);

  if (cols.name === null || cols.price === null) {
    throw new Error(
      `Encabezados no reconocidos. Encontramos: ${headers.join(", ")}`,
    );
  }

  const lines: ParsedLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;
    const name = (row[cols.name] ?? "").trim();
    const sku = cols.sku !== null ? (row[cols.sku] ?? "").trim() : "";
    const price = parsePrice(row[cols.price]);
    if (!name || price === null) continue;

    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) raw[h] = row[idx] ?? "";
    });

    lines.push({
      index: lines.length,
      supplier_name: name,
      supplier_sku: sku || null,
      price_cop: price,
      raw,
    });
  }
  return lines;
}

/**
 * Mini CSV splitter que detecta el delimitador (`,` vs `;`) y respeta
 * comillas dobles (incluido el escape `""`).
 */
function splitCsvRows(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : ",";

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      current.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      current.push(field);
      field = "";
      if (current.some((v) => v.trim().length > 0)) rows.push(current);
      current = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    if (current.some((v) => v.trim().length > 0)) rows.push(current);
  }
  return rows;
}
