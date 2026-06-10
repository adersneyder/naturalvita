/**
 * lib/guias/markdown.tsx
 *
 * Mini-renderer de markdown → React para los cuerpos de sección de las
 * guías generadas por IA. Cobertura deliberadamente acotada al subconjunto
 * que el prompt del generador permite producir:
 *   - Párrafos (separados por línea en blanco)
 *   - Listas con viñetas (- item) y numeradas (1. item)
 *   - Inline: **negrita**, *cursiva*, [texto](url)
 *
 * Sin dependencias externas (decisión del proyecto: sin librerías extra).
 * Los enlaces internos (/...) usan <a> normal — las guías se renderizan
 * server-side y la navegación de Next intercepta el click igualmente.
 */

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Tokeniza negrita, cursiva y links en una sola pasada.
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("[")) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        const isExternal = /^https?:\/\//.test(lm[2]) && !lm[2].includes("naturalvita.co");
        out.push(
          <a
            key={`${keyPrefix}-a${i}`}
            href={lm[2]}
            className="text-[var(--color-iris-700)] underline"
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {lm[1]}
          </a>,
        );
      } else {
        out.push(tok);
      }
    } else {
      out.push(<em key={`${keyPrefix}-i${i}`}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(md: string): ReactNode {
  const blocks = md
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, bi) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    const isUl = lines.every((l) => /^[-*]\s+/.test(l));
    const isOl = lines.every((l) => /^\d+[.)]\s+/.test(l));

    if (isUl && lines.length > 0) {
      return (
        <ul key={bi} className="list-disc pl-6 space-y-2">
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[-*]\s+/, ""), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    if (isOl && lines.length > 0) {
      return (
        <ol key={bi} className="list-decimal pl-6 space-y-2">
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\d+[.)]\s+/, ""), `${bi}-${li}`)}</li>
          ))}
        </ol>
      );
    }
    return <p key={bi}>{renderInline(lines.join(" "), `${bi}`)}</p>;
  });
}
