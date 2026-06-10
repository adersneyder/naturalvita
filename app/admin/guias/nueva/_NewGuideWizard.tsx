"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { publishGuide, type PublishGuideInput } from "../actions";

/**
 * Wizard de creación de guías con IA. Tres pasos en una sola pantalla:
 *   1. Tema → "Generar con IA" (Claude redacta el borrador completo,
 *      citando solo productos reales del catálogo).
 *   2. Preview editable (título, dek, TL;DR) + selección de imagen hero
 *      entre las candidatas (galería del sitio + fotos de los productos
 *      citados; la sugerida por la IA viene preseleccionada).
 *   3. Publicar (en vivo al instante) o guardar como borrador.
 */

type ImageCandidate = {
  url: string;
  alt: string;
  source: "galeria" | "producto";
  suggested: boolean;
};

type GeneratedGuide = {
  slug: string;
  title: string;
  dek: string;
  tldr: string;
  reading_time: string;
  sections: Array<{ id: string; heading: string; body_md: string }>;
  faqs: Array<{ q: string; a: string }>;
  product_mentions: Array<{ slug: string; why: string }>;
};

const TOPIC_SUGGESTIONS = [
  "Creatina para mujeres: mitos, dosis y cómo empezar",
  "Omega 3 en Colombia: cuánto tomar y cómo elegir uno bueno",
  "Cómo escoger probióticos: cepas, UFC y para qué sirven",
  "Biotina para el cabello: qué dice la evidencia y qué esperar",
];

export default function NewGuideWizard() {
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [guide, setGuide] = useState<GeneratedGuide | null>(null);
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageCandidate | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function generate() {
    setGenerating(true);
    setError(null);
    setGuide(null);
    setPublishedSlug(null);
    try {
      const res = await fetch("/api/admin/guias/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error generando la guía");
        return;
      }
      setGuide(data.guide);
      setWarnings(data.warnings ?? []);
      setCandidates(data.imageCandidates ?? []);
      const suggested = (data.imageCandidates ?? []).find(
        (c: ImageCandidate) => c.suggested,
      );
      setSelectedImage(suggested ?? data.imageCandidates?.[0] ?? null);
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  function publish(asDraft: boolean) {
    if (!guide || !selectedImage) return;
    setError(null);
    const input: PublishGuideInput = {
      slug: guide.slug,
      title: guide.title,
      dek: guide.dek,
      tldr: guide.tldr,
      reading_time: guide.reading_time,
      hero_image_url: selectedImage.url,
      hero_image_alt: selectedImage.alt,
      sections: guide.sections,
      faqs: guide.faqs,
      product_mentions: guide.product_mentions,
    };
    startTransition(async () => {
      const result = await publishGuide(input, asDraft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublishedSlug(asDraft ? null : result.slug);
      if (asDraft) {
        setGuide(null);
        setTopic("");
      }
    });
  }

  if (publishedSlug) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-xl bg-[var(--color-leaf-100)] border border-[var(--color-leaf-700)]/20 p-6 text-center">
          <p className="font-serif text-xl text-[var(--color-leaf-900)] mb-2">
            Guía publicada
          </p>
          <p className="text-sm text-[var(--color-earth-700)] mb-4">
            Ya está en vivo y entrará al sitemap automáticamente.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/guias/${publishedSlug}`}
              target="_blank"
              className="px-4 py-2 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium"
            >
              Ver guía →
            </Link>
            <button
              type="button"
              onClick={() => {
                setPublishedSlug(null);
                setGuide(null);
                setTopic("");
              }}
              className="px-4 py-2 rounded-lg border border-[var(--color-earth-200)] text-sm"
            >
              Crear otra
            </button>
          </div>
          <p className="text-xs text-[var(--color-earth-500)] mt-4">
            Tip: pide indexación en Search Console (Inspección de URLs) para
            que Google la lea hoy mismo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="font-serif text-xl font-medium text-[var(--color-leaf-900)] m-0">
          Nueva guía con IA
        </h1>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Escribe el tema. Claude redacta el borrador citando solo productos
          reales del catálogo; tú eliges la imagen y publicas.
        </p>
      </header>

      {/* Paso 1: tema */}
      <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4 mb-4">
        <label
          htmlFor="topic"
          className="block text-xs font-medium text-[var(--color-earth-700)] mb-2"
        >
          Tema de la guía
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          placeholder='Ej: "Creatina para mujeres: mitos, dosis y cómo empezar"'
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-200)] text-sm focus:outline-none focus:border-[var(--color-iris-700)]"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {TOPIC_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTopic(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] text-[var(--color-earth-700)] hover:border-[var(--color-iris-700)]"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating || topic.trim().length < 5}
          className="mt-3 px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] disabled:opacity-50"
        >
          {generating ? "Generando… (30-60 s)" : "Generar con IA"}
        </button>
        {error && <p className="text-xs text-[#B23A1F] mt-2">{error}</p>}
        {warnings.map((w, i) => (
          <p key={i} className="text-xs text-[#854F0B] mt-2">
            ⚠ {w}
          </p>
        ))}
      </section>

      {/* Paso 2: preview + imagen */}
      {guide && (
        <>
          <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4 mb-4 space-y-3">
            <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0">
              Borrador (edita lo que necesites)
            </h2>
            <div>
              <label className="block text-[11px] text-[var(--color-earth-500)] mb-1">
                Título
              </label>
              <input
                value={guide.title}
                onChange={(e) => setGuide({ ...guide, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-200)] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-earth-500)] mb-1">
                Slug: /guias/
                <span className="font-mono">{guide.slug}</span>
              </label>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-earth-500)] mb-1">
                Dek (subtítulo)
              </label>
              <textarea
                value={guide.dek}
                onChange={(e) => setGuide({ ...guide, dek: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-200)] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--color-earth-500)] mb-1">
                TL;DR (lo que las IAs citan — debe tener cifras)
              </label>
              <textarea
                value={guide.tldr}
                onChange={(e) => setGuide({ ...guide, tldr: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-earth-200)] text-sm"
              />
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-[var(--color-iris-700)] text-xs">
                Ver secciones ({guide.sections.length}), FAQs ({guide.faqs.length}) y
                productos citados ({guide.product_mentions.length})
              </summary>
              <div className="mt-3 space-y-4 max-h-96 overflow-y-auto pr-2">
                {guide.sections.map((s) => (
                  <div key={s.id}>
                    <p className="font-medium text-[var(--color-leaf-900)] m-0">
                      {s.heading}
                    </p>
                    <p className="text-xs text-[var(--color-earth-700)] whitespace-pre-wrap mt-1">
                      {s.body_md}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="font-medium text-[var(--color-leaf-900)] m-0">FAQs</p>
                  {guide.faqs.map((f, i) => (
                    <p key={i} className="text-xs text-[var(--color-earth-700)] mt-1">
                      <strong>{f.q}</strong> — {f.a}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="font-medium text-[var(--color-leaf-900)] m-0">
                    Productos citados
                  </p>
                  {guide.product_mentions.map((m) => (
                    <p key={m.slug} className="text-xs text-[var(--color-earth-700)] mt-1">
                      <span className="font-mono">{m.slug}</span> — {m.why}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <section className="bg-white rounded-xl border border-[rgba(47,98,56,0.1)] p-4 mb-4">
            <h2 className="font-serif text-sm font-medium text-[var(--color-leaf-900)] m-0 mb-1">
              Imagen hero
            </h2>
            <p className="text-[11px] text-[var(--color-earth-500)] mb-3">
              La marcada con ★ es la sugerencia automática. Click para cambiar.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {candidates.map((c) => (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => setSelectedImage(c)}
                  className={`relative aspect-[16/10] rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage?.url === c.url
                      ? "border-[var(--color-iris-700)]"
                      : "border-transparent hover:border-[var(--color-earth-200)]"
                  }`}
                  title={c.alt}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.url}
                    alt={c.alt}
                    className="w-full h-full object-cover"
                  />
                  {c.suggested && (
                    <span className="absolute top-1 left-1 text-[10px] bg-white/90 rounded px-1">
                      ★
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 text-[9px] bg-black/50 text-white px-1 py-0.5 truncate">
                    {c.source === "galeria" ? "Galería" : "Producto"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Paso 3: publicar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => publish(false)}
              disabled={pending || !selectedImage}
              className="px-5 py-2.5 rounded-lg bg-[var(--color-leaf-700)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Publicando…" : "Publicar ahora"}
            </button>
            <button
              type="button"
              onClick={() => publish(true)}
              disabled={pending || !selectedImage}
              className="px-5 py-2.5 rounded-lg border border-[var(--color-earth-200)] text-[var(--color-earth-700)] text-sm font-medium hover:bg-[var(--color-earth-50)] disabled:opacity-50"
            >
              Guardar como borrador
            </button>
          </div>
        </>
      )}
    </div>
  );
}
