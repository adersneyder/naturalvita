import React from "react";

/**
 * Renderer markdown minimalista para los 5 campos editoriales generados por IA.
 * Soporta exactamente el subset que producimos:
 *   - **negrillas**
 *   - listas con guiones (- item)
 *   - párrafos separados por línea en blanco
 *   - cursivas con *texto*
 *
 * No usamos react-markdown para mantener cero dependencias y control total
 * sobre el styling. Si en el futuro necesitamos tablas, código, links, etc.,
 * cambiamos a react-markdown.
 */

type Props = {
  text: string;
  /** Tamaño del texto. Default md. */
  size?: "sm" | "md" | "lg";
};

export default function MarkdownRenderer({ text, size = "md" }: Props) {
  if (!text || !text.trim()) return null;

  const sizeClass = {
    sm: "text-sm leading-relaxed",
    md: "text-[15px] leading-relaxed",
    lg: "text-base leading-relaxed",
  }[size];

  return <div className={`${sizeClass} text-[var(--color-earth-900)]`}>{renderBlocks(text)}</div>;
}

function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="list-disc pl-5 space-y-1 my-2 marker:text-[var(--color-leaf-500)]"
        >
          {bulletBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      bulletBuffer = [];
    }
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = paragraphBuffer.join(" ").trim();
      if (text) {
        blocks.push(
          <p key={`p-${blocks.length}`} className="my-2">
            {renderInline(text)}
          </p>,
        );
      }
      paragraphBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("- ")) {
      flushParagraph();
      bulletBuffer.push(line.slice(2));
    } else if (line === "") {
      flushBullets();
      flushParagraph();
    } else if (line.match(/^\*\*[^*]+\*\*$/)) {
      // Línea que es solo un encabezado bold (ej: "**Composición**")
      flushBullets();
      flushParagraph();
      blocks.push(
        <h4
          key={`h-${blocks.length}`}
          className="font-serif text-base font-medium text-[var(--color-leaf-900)] mt-4 mb-2"
        >
          {line.slice(2, -2)}
        </h4>,
      );
    } else {
      flushBullets();
      paragraphBuffer.push(line);
    }
  }
  flushBullets();
  flushParagraph();

  return blocks;
}

/**
 * Renderiza inline markdown: **bold**, *italic*.
 * No procesa anidamientos (no hace falta en nuestro contenido).
 */
function renderInline(line: string): React.ReactNode[] {
  // Procesamos bold primero, luego italic en el texto restante.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-medium text-[var(--color-leaf-900)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);
  }
  return parts;
}
