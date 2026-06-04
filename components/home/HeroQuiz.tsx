"use client";

// components/home/HeroQuiz.tsx
// Hero del Home con quiz objetivo-primero (NaturalVita).
// Flujo: paso 1 elige OBJETIVO (necesidad) -> paso 2 elige ETAPA ->
// paso 3 muestra hasta 3 productos recomendados (lee mapa pre-computado).
// Layout 2 columnas (~62vh): mensaje + quiz a la izquierda, composición
// de marca a la derecha. Estética del repo: crema/blanco, Georgia serif,
// acentos verde #1E7D2E y púrpura #4A2E9A. CSS scoped con clases nv-hq-*.

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { LIFE_STAGES, type LifeStage, type QuizNeed, type QuizResult } from "@/lib/quiz/types";
import { resolveQuizAction, saveQuizResultAction } from "@/lib/quiz/actions";

type Step = "objetivo" | "etapa" | "resultado";

interface HeroQuizProps {
  needs: QuizNeed[];
  /** true si hay sesión de cliente (oculta la captura de email). */
  isLoggedIn?: boolean;
}

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function HeroQuiz({ needs, isLoggedIn = false }: HeroQuizProps) {
  const [step, setStep] = useState<Step>("objetivo");
  const [need, setNeed] = useState<QuizNeed | null>(null);
  const [stage, setStage] = useState<LifeStage | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const pickNeed = useCallback((n: QuizNeed) => {
    setNeed(n);
    setStep("etapa");
  }, []);

  const pickStage = useCallback(
    async (s: LifeStage) => {
      if (!need) return;
      setStage(s);
      setLoading(true);
      setStep("resultado");
      const res = await resolveQuizAction({ needSlug: need.slug, stage: s });
      setLoading(false);
      if (res.ok) {
        setResult(res.result);
        // Guardado silencioso del resultado (logueado: vincula a cuenta)
        if (isLoggedIn) {
          void saveQuizResultAction({
            needSlug: need.slug,
            stage: s,
            productsSnapshot: res.result.products.map((p) => ({
              productId: p.productId,
              name: p.name,
              slug: p.slug,
              tier: p.tier,
            })),
          }).then(() => setSaved(true));
        }
      }
    },
    [need, isLoggedIn],
  );

  const restart = useCallback(() => {
    setStep("objetivo");
    setNeed(null);
    setStage(null);
    setResult(null);
    setSaved(false);
  }, []);

  return (
    <section className="nv-hq" aria-label="Encuentra tu producto ideal">
      <div className="nv-hq__inner">
        {/* Columna izquierda: mensaje + quiz */}
        <div className="nv-hq__left">
          <p className="nv-hq__eyebrow">Bienestar que crece contigo</p>
          <h1 className="nv-hq__headline">
            Lo natural, seleccionado con criterio.
            <span className="nv-hq__headline-accent"> Para cada etapa de la vida.</span>
          </h1>

          {/* Indicador de pasos */}
          <div className="nv-hq__steps" aria-hidden="true">
            <span className={`nv-hq__dot ${step === "objetivo" ? "is-active" : ""} ${need ? "is-done" : ""}`} />
            <span className={`nv-hq__dot ${step === "etapa" ? "is-active" : ""} ${stage ? "is-done" : ""}`} />
            <span className={`nv-hq__dot ${step === "resultado" ? "is-active" : ""}`} />
          </div>

          {/* PASO 1: objetivo */}
          {step === "objetivo" && (
            <div className="nv-hq__panel">
              <h2 className="nv-hq__q">¿Qué quieres cuidar hoy?</h2>
              <div className="nv-hq__needs">
                {needs.map((n) => (
                  <button
                    key={n.slug}
                    type="button"
                    className="nv-hq__need"
                    onClick={() => pickNeed(n)}
                  >
                    <span className="nv-hq__need-name">{n.name}</span>
                    {n.tagline ? <span className="nv-hq__need-tag">{n.tagline}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: etapa */}
          {step === "etapa" && need && (
            <div className="nv-hq__panel">
              <button className="nv-hq__back" onClick={() => setStep("objetivo")} type="button">
                ← Cambiar objetivo
              </button>
              <h2 className="nv-hq__q">¿Para quién es?</h2>
              <p className="nv-hq__q-sub">Buscas algo para <strong>{need.name.toLowerCase()}</strong></p>
              <div className="nv-hq__stages">
                {LIFE_STAGES.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    className="nv-hq__stage"
                    onClick={() => pickStage(s.slug)}
                  >
                    <span className="nv-hq__stage-label">{s.label}</span>
                    <span className="nv-hq__stage-hint">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 3: resultado */}
          {step === "resultado" && (
            <div className="nv-hq__panel">
              <button className="nv-hq__back" onClick={restart} type="button">
                ← Empezar de nuevo
              </button>

              {loading && (
                <div className="nv-hq__loading" role="status">
                  <span className="nv-hq__spinner" aria-hidden="true" />
                  Buscando lo mejor para ti…
                </div>
              )}

              {!loading && result && result.isEmpty && (
                <div className="nv-hq__empty">
                  <h2 className="nv-hq__q">Para esta etapa, mejor con guía profesional</h2>
                  <p className="nv-hq__empty-text">
                    No tenemos una recomendación automática para{" "}
                    <strong>{need?.name.toLowerCase()}</strong> en esta etapa. Para el cuidado
                    en estos casos, lo más responsable es acompañarte de un profesional de la salud.
                  </p>
                  <Link href="/contacto" className="nv-hq__cta-ghost">
                    Escríbenos y te orientamos
                  </Link>
                </div>
              )}

              {!loading && result && !result.isEmpty && (
                <div className="nv-hq__results">
                  <h2 className="nv-hq__q">
                    Para {need?.name.toLowerCase()}, te recomendamos:
                  </h2>
                  <ul className="nv-hq__cards">
                    {result.products.map((p) => (
                      <li key={p.productId}>
                        <Link href={`/producto/${p.slug}`} className="nv-hq__card">
                          <span className="nv-hq__card-media">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                width={64}
                                height={64}
                                className="nv-hq__card-img"
                              />
                            ) : (
                              <span className="nv-hq__card-img nv-hq__card-img--ph" aria-hidden="true" />
                            )}
                          </span>
                          <span className="nv-hq__card-body">
                            <span className="nv-hq__card-name">{p.name}</span>
                            {p.reason ? <span className="nv-hq__card-reason">{p.reason}</span> : null}
                            <span className="nv-hq__card-foot">
                              {p.price != null ? (
                                <span className="nv-hq__card-price">{PESOS.format(p.price)}</span>
                              ) : null}
                              {p.tier === "direct" ? (
                                <span className="nv-hq__tag nv-hq__tag--direct">Recomendado</span>
                              ) : (
                                <span className="nv-hq__tag nv-hq__tag--adj">También ayuda</span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <p className="nv-hq__disclaimer">
                    Recomendaciones de bienestar, no sustituyen el consejo de un profesional de la salud.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: escena animada "El jardín del bienestar".
            Capas (de fondo a frente):
              - 3 imágenes en rotación con crossfade + Ken Burns (5s c/u,
                15s loop total): naturaleza → suplementos → familia.
              - Velo gradient sutil para asegurar legibilidad del texto
                superpuesto en cualquier foto.
              - 2 blobs orgánicos rotando muy lento (60s)
              - 6 partículas flotantes con opacidad baja
              - Palabra rotativa superpuesta (cuenta la narrativa
                "esto es lo que mejoramos en ti")
              - Badge "+299 productos seleccionados"
              - Pista inferior "tu mejora empieza aquí ↗"
            Todo CSS, sin libs externas. Respeta prefers-reduced-motion. */}
        <div className="nv-hq__right" aria-hidden="true">
          <div className="nv-hq__brand">
            {/* Capa base: 3 imágenes rotando con crossfade + Ken Burns */}
            <div className="nv-hq__slides">
              <div className="nv-hq__slide nv-hq__slide--1">
                <Image
                  src="/home/hero-1-naturaleza.webp"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 45vw"
                  className="nv-hq__slide-img"
                />
              </div>
              <div className="nv-hq__slide nv-hq__slide--2">
                <Image
                  src="/home/hero-2-suplementos.webp"
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 45vw"
                  className="nv-hq__slide-img"
                />
              </div>
              <div className="nv-hq__slide nv-hq__slide--3">
                <Image
                  src="/home/hero-3-familia.webp"
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 45vw"
                  className="nv-hq__slide-img"
                />
              </div>
            </div>

            {/* Velo gradient para legibilidad del texto encima */}
            <div className="nv-hq__veil" />

            {/* Capa: blobs orgánicos de fondo (rotan muy lento, sutiles) */}
            <div className="nv-hq__blob nv-hq__blob--a" />
            <div className="nv-hq__blob nv-hq__blob--b" />

            {/* Capa: partículas flotantes — 6 puntos con fade */}
            <div className="nv-hq__particles">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={`nv-hq__particle nv-hq__particle--${i + 1}`} />
              ))}
            </div>

            {/* Capa: palabra rotativa superpuesta */}
            <div className="nv-hq__rotator">
              <span className="nv-hq__rot-eyebrow">Mejoramos tu</span>
              <div className="nv-hq__rot-stack" role="presentation">
                <span className="nv-hq__rot-word" style={{ animationDelay: "0s" }}>Energía</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "2.5s" }}>Calma</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "5s" }}>Belleza</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "7.5s" }}>Defensas</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "10s" }}>Digestión</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "12.5s" }}>Huesos</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "15s" }}>Articulaciones</span>
                <span className="nv-hq__rot-word" style={{ animationDelay: "17.5s" }}>Peso</span>
              </div>
            </div>

            {/* Capa: badge "+299 productos" */}
            <div className="nv-hq__brand-badge">
              <span className="nv-hq__brand-badge-num">+299</span>
              <span className="nv-hq__brand-badge-lbl">productos seleccionados</span>
            </div>

            {/* Capa: pista inferior con flecha hacia el quiz */}
            <div className="nv-hq__hint">
              <span className="nv-hq__hint-arrow" aria-hidden="true">↖</span>
              <span>Tu mejora empieza aquí</span>
            </div>
          </div>
        </div>
      </div>

      <HeroQuizStyles />
    </section>
  );
}

// Estilos scoped del Hero quiz. Hex literales (no tokens) para coherencia
// con el resto del Home del repo.
function HeroQuizStyles() {
  return (
    <style>{`
/* Hero con profundidad: gradiente vertical + dos blobs radiales muy
   suaves (verde y púrpura) que dan textura sin distraer. */
.nv-hq {
  position: relative;
  background:
    radial-gradient(60% 50% at 85% 12%, rgba(30,125,46,.07), transparent 60%),
    radial-gradient(50% 50% at 8% 85%, rgba(74,46,154,.06), transparent 60%),
    linear-gradient(180deg,#FFFFFF 0%,#FAF7F2 100%);
  overflow: hidden;
}
.nv-hq__inner {
  position: relative;
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
  min-height: 72vh; display: grid; grid-template-columns: 1.05fr 0.95fr;
  gap: 56px; align-items: center;
}
.nv-hq__left { padding: 56px 0; }
.nv-hq__eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 13px; letter-spacing: 1.8px; text-transform: uppercase;
  color: #1E7D2E; font-weight: 700; margin: 0 0 16px;
}
.nv-hq__eyebrow::before {
  content: ""; display: inline-block; width: 28px; height: 2px;
  background: #1E7D2E; border-radius: 2px;
}
.nv-hq__headline {
  font-family: Georgia, 'Times New Roman', serif; font-weight: 400;
  font-size: clamp(32px, 5vw, 56px); line-height: 1.08; color: #2A2722;
  margin: 0 0 28px; letter-spacing: -0.8px;
}
.nv-hq__headline-accent {
  color: #4A2E9A;
  font-style: italic;
}
.nv-hq__steps { display: flex; gap: 8px; margin-bottom: 22px; }
.nv-hq__dot {
  width: 32px; height: 4px; border-radius: 2px; background: #E8DFD0;
  transition: background .25s, transform .25s;
}
.nv-hq__dot.is-active { background: #4A2E9A; transform: scaleX(1.15); transform-origin: left; }
.nv-hq__dot.is-done { background: #1E7D2E; }
.nv-hq__panel {
  background: #FFFFFF;
  border: 1px solid #ECE4D4;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(42,39,34,.04), 0 18px 48px rgba(42,39,34,.07);
  animation: nv-hq-fade .35s ease;
}
@keyframes nv-hq-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.nv-hq__q {
  font-family: Georgia, serif; font-weight: 400; font-size: 24px;
  color: #2A2722; margin: 0 0 6px; letter-spacing: -0.2px;
}
.nv-hq__q-sub { font-size: 14px; color: #8B8881; margin: 0 0 18px; }
.nv-hq__q-sub strong { color: #4A2E9A; font-weight: 600; }
.nv-hq__needs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px;
}
.nv-hq__need {
  position: relative; text-align: left; background: #FFFFFF;
  border: 1.5px solid #ECE4D4; border-radius: 14px;
  padding: 14px 16px; cursor: pointer;
  transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
  display: flex; flex-direction: column; gap: 3px;
}
.nv-hq__need::after {
  content: "→"; position: absolute; top: 14px; right: 14px;
  font-size: 14px; color: #C7BFB1; transition: color .22s, transform .22s;
}
.nv-hq__need:hover {
  border-color: #4A2E9A;
  box-shadow: 0 2px 6px rgba(74,46,154,.05), 0 12px 28px rgba(74,46,154,.12);
  transform: translateY(-2px);
}
.nv-hq__need:hover::after { color: #4A2E9A; transform: translateX(3px); }
.nv-hq__need-name { font-size: 15px; font-weight: 600; color: #2A2722; padding-right: 16px; }
.nv-hq__need-tag { font-size: 12.5px; color: #8B8881; line-height: 1.35; }
.nv-hq__stages { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 18px; }
.nv-hq__stage {
  text-align: center; background: #FFFFFF;
  border: 1.5px solid #ECE4D4; border-radius: 14px;
  padding: 16px 8px; cursor: pointer;
  transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
  display: flex; flex-direction: column; gap: 3px;
}
.nv-hq__stage:hover {
  border-color: #1E7D2E;
  box-shadow: 0 2px 6px rgba(30,125,46,.05), 0 12px 28px rgba(30,125,46,.12);
  transform: translateY(-2px);
}
.nv-hq__stage-label { font-size: 14.5px; font-weight: 600; color: #2A2722; }
.nv-hq__stage-hint { font-size: 11.5px; color: #8B8881; }
.nv-hq__back {
  background: none; border: none; color: #8B8881; font-size: 13px; cursor: pointer;
  padding: 0; margin-bottom: 14px; transition: color .15s;
}
.nv-hq__back:hover { color: #4A2E9A; }
.nv-hq__loading { display: flex; align-items: center; gap: 12px; color: #5C5048; font-size: 15px; padding: 24px 0; }
.nv-hq__spinner {
  width: 18px; height: 18px; border: 2px solid #E8DFD0; border-top-color: #4A2E9A;
  border-radius: 50%; animation: nv-hq-spin .7s linear infinite;
}
@keyframes nv-hq-spin { to { transform: rotate(360deg); } }
.nv-hq__empty { padding: 8px 0; }
.nv-hq__empty-text { font-size: 14.5px; color: #5C5048; line-height: 1.6; margin: 0 0 18px; }
.nv-hq__empty-text strong { color: #2A2722; }
.nv-hq__cta-ghost {
  display: inline-block; border: 1px solid #4A2E9A; color: #4A2E9A; border-radius: 10px;
  padding: 10px 18px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all .18s;
}
.nv-hq__cta-ghost:hover { background: #4A2E9A; color: #fff; }
.nv-hq__cards { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.nv-hq__card {
  display: flex; gap: 14px; align-items: center;
  background: #FFFFFF; border: 1.5px solid #ECE4D4; border-radius: 14px;
  padding: 14px; text-decoration: none;
  transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
}
.nv-hq__card:hover {
  border-color: #4A2E9A;
  box-shadow: 0 2px 6px rgba(74,46,154,.05), 0 14px 32px rgba(74,46,154,.14);
  transform: translateY(-2px);
}
.nv-hq__card-media { flex-shrink: 0; }
.nv-hq__card-img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: #F5F1E8; }
.nv-hq__card-img--ph { display: block; }
.nv-hq__card-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nv-hq__card-name { font-size: 14.5px; font-weight: 600; color: #2A2722; line-height: 1.25; }
.nv-hq__card-reason { font-size: 12.5px; color: #8B8881; line-height: 1.4; }
.nv-hq__card-foot { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
.nv-hq__card-price { font-size: 14px; font-weight: 700; color: #1E7D2E; }
.nv-hq__tag { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; letter-spacing: .3px; }
.nv-hq__tag--direct { background: #E5F1E7; color: #1E5E34; }
.nv-hq__tag--adj { background: #F0EBFA; color: #4A2E9A; }
.nv-hq__disclaimer { font-size: 11.5px; color: #A8A39B; margin: 14px 0 0; line-height: 1.5; }
.nv-hq__right { height: 100%; display: flex; align-items: center; }
/* ─────────────────────────────────────────────────────────────────────
   Escena del hero: 3 imágenes en rotación con crossfade + Ken Burns
   ───────────────────────────────────────────────────────────────────── */
.nv-hq__brand {
  position: relative; width: 100%; aspect-ratio: 4 / 5;
  border-radius: 24px; overflow: hidden;
  background: #F5F1E8;
  box-shadow: 0 1px 2px rgba(42,39,34,.04), 0 20px 48px rgba(42,39,34,.10);
  isolation: isolate;
}

/* Capa base: contenedor de los slides */
.nv-hq__slides { position: absolute; inset: 0; z-index: 0; }

/* Cada slide: ocupa todo el contenedor, fade y zoom in/out 15s loop.
   3 slides × 5s c/u = 15s total. Cada slide visible ~5s con crossfade
   de 0.5s al inicio y final. */
.nv-hq__slide {
  position: absolute; inset: 0;
  opacity: 0;
  animation: nv-slide-fade 15s ease-in-out infinite,
             nv-slide-zoom 15s ease-out infinite;
  will-change: opacity, transform;
}
.nv-hq__slide--1 { animation-delay: 0s,  0s;  }
.nv-hq__slide--2 { animation-delay: 5s,  5s;  }
.nv-hq__slide--3 { animation-delay: 10s, 10s; }

.nv-hq__slide-img { object-fit: cover; }

/* Fade: visible de 0 a 33% (0-5s) con entrada/salida suave */
@keyframes nv-slide-fade {
  0%               { opacity: 0; }
  3.3%             { opacity: 1; }   /* fade-in completo a los 0.5s */
  30%              { opacity: 1; }   /* permanece hasta 4.5s */
  33.3%, 100%      { opacity: 0; }   /* fade-out a los 5s */
}

/* Ken Burns: zoom muy lento de 1.0 a 1.06 durante el slot visible.
   El zoom corre durante los 5s de visibilidad de cada slide; el resto
   del ciclo no se ve (opacity 0). */
@keyframes nv-slide-zoom {
  0%   { transform: scale(1.0); }
  33%  { transform: scale(1.06); }
  100% { transform: scale(1.0); }
}

/* Velo gradient encima de las imágenes: oscurece esquinas para que el
   texto blanco/púrpura superpuesto sea legible sin tapar la foto. */
.nv-hq__veil {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(180deg,
      rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0.20) 18%,
      rgba(0,0,0,0) 40%,
      rgba(0,0,0,0) 60%,
      rgba(0,0,0,0.20) 88%,
      rgba(0,0,0,0.35) 100%);
}

/* Blobs orgánicos de fondo: muy sutiles (no compiten con la foto). */
.nv-hq__blob {
  position: absolute; border-radius: 50%; filter: blur(60px);
  pointer-events: none; z-index: 2; mix-blend-mode: screen;
  animation: nv-blob-rot 60s linear infinite;
}
.nv-hq__blob--a {
  width: 60%; height: 60%; top: -10%; right: -15%;
  background: radial-gradient(circle, rgba(30,125,46,.22) 0%, rgba(30,125,46,0) 70%);
}
.nv-hq__blob--b {
  width: 55%; height: 55%; bottom: -8%; left: -12%;
  background: radial-gradient(circle, rgba(74,46,154,.20) 0%, rgba(74,46,154,0) 70%);
  animation-direction: reverse; animation-duration: 75s;
}
@keyframes nv-blob-rot {
  from { transform: rotate(0deg) translateX(0); }
  50%  { transform: rotate(180deg) translateX(8px); }
  to   { transform: rotate(360deg) translateX(0); }
}

/* Partículas flotantes — 6 puntos con opacidad reducida (no compiten
   con las fotos, solo añaden vida). */
.nv-hq__particles {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
}
.nv-hq__particle {
  position: absolute; width: 6px; height: 6px; border-radius: 50%;
  background: #FFFFFF; opacity: 0;
  animation: nv-particle-rise linear infinite;
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.6));
}
@keyframes nv-particle-rise {
  0%   { transform: translateY(0)    scale(0.6); opacity: 0; }
  10%  { opacity: 0.45; }
  90%  { opacity: 0.35; }
  100% { transform: translateY(-160px) scale(1.1); opacity: 0; }
}
.nv-hq__particle--1 { left: 14%; bottom: 12%; animation-duration: 11s; animation-delay: 0s; }
.nv-hq__particle--2 { left: 86%; bottom: 22%; animation-duration: 13s; animation-delay: 1.8s; width:5px; height:5px; }
.nv-hq__particle--3 { left: 38%; bottom: 8%;  animation-duration: 15s; animation-delay: 3.2s; width:4px; height:4px; }
.nv-hq__particle--4 { left: 72%; bottom: 14%; animation-duration: 12s; animation-delay: 4.6s; width:5px; height:5px; }
.nv-hq__particle--5 { left: 24%; bottom: 30%; animation-duration: 14s; animation-delay: 2.4s; width:4px; height:4px; }
.nv-hq__particle--6 { left: 62%; bottom: 40%; animation-duration: 13s; animation-delay: 6s;   width:3px; height:3px; }

/* Palabra rotativa superpuesta — "Mejoramos tu [Energía/Calma/...]"
   20s total = 8 palabras × 2.5s c/u. Cada palabra entra con fade,
   se queda visible y sale con fade. Estilo de píldora glassmorphism
   para legibilidad sobre cualquier foto. */
.nv-hq__rotator {
  position: absolute; top: 24px; left: 24px; right: 24px;
  z-index: 4; display: flex; flex-direction: column; align-items: flex-start;
  pointer-events: none;
}
.nv-hq__rot-eyebrow {
  font-size: 10.5px; letter-spacing: 2.4px; text-transform: uppercase;
  color: #FFFFFF; font-weight: 700; margin-bottom: 6px;
  text-shadow: 0 1px 6px rgba(0,0,0,.35);
}
.nv-hq__rot-stack {
  position: relative; height: 1.2em;
  font-family: Georgia, serif; font-size: clamp(28px, 3.4vw, 40px);
  font-style: italic; letter-spacing: -0.4px; color: #FFFFFF;
  text-shadow: 0 2px 12px rgba(0,0,0,.40), 0 1px 3px rgba(0,0,0,.25);
}
.nv-hq__rot-word {
  position: absolute; left: 0; top: 0;
  transform: translateY(8px);
  opacity: 0; white-space: nowrap;
  animation: nv-word-cycle 20s ease-in-out infinite;
}
@keyframes nv-word-cycle {
  0%, 13.5%   { opacity: 0; transform: translateY(8px); }
  2%, 11.5%   { opacity: 1; transform: translateY(0); }
  100%        { opacity: 0; transform: translateY(-8px); }
}

/* Pista inferior — "Tu mejora empieza aquí ↖" */
.nv-hq__hint {
  position: absolute; bottom: 24px; right: 24px;
  z-index: 4; display: inline-flex; align-items: center; gap: 8px;
  font-family: Georgia, serif; font-style: italic; font-size: 13px;
  color: #2A2722;
  background: rgba(255,255,255,.88); backdrop-filter: blur(8px);
  padding: 9px 16px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.7);
  box-shadow: 0 1px 2px rgba(42,39,34,.06), 0 10px 24px rgba(42,39,34,.18);
  animation: nv-hint-bob 3s ease-in-out infinite;
}
.nv-hq__hint-arrow {
  color: #4A2E9A; font-style: normal; font-size: 16px;
  animation: nv-hint-arrow 2s ease-in-out infinite;
}
@keyframes nv-hint-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
@keyframes nv-hint-arrow {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-3px, 3px); }
}

/* Respeto a usuarios con prefers-reduced-motion: muestran solo la
   primera imagen estática, sin rotación, sin Ken Burns, sin partículas.
   El rotator de palabras conserva un fade muy lento para que el contenido
   no desaparezca completamente. */
@media (prefers-reduced-motion: reduce) {
  .nv-hq__slide { animation: none; opacity: 0; }
  .nv-hq__slide--1 { opacity: 1; }
  .nv-hq__blob,
  .nv-hq__particle,
  .nv-hq__hint,
  .nv-hq__hint-arrow {
    animation: none;
  }
  .nv-hq__rot-word { animation-duration: 30s; }
}
.nv-hq__brand-badge {
  position: absolute; bottom: 20px; left: 20px; z-index: 4;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px);
  border-radius: 16px; padding: 14px 20px; display: flex; flex-direction: column;
  box-shadow: 0 1px 2px rgba(42,39,34,.06), 0 14px 36px rgba(42,39,34,.22);
  border: 1px solid rgba(255,255,255,.7);
}
.nv-hq__brand-badge-num {
  font-family: Georgia, serif; font-size: 28px; color: #4A2E9A;
  line-height: 1; font-weight: 400; letter-spacing: -0.5px;
}
.nv-hq__brand-badge-lbl {
  font-size: 11.5px; color: #5C5048; margin-top: 4px;
  letter-spacing: 0.3px;
}
@media (max-width: 900px) {
  .nv-hq__inner { grid-template-columns: 1fr; min-height: auto; gap: 28px; padding: 24px; }
  .nv-hq__right { order: -1; }
  .nv-hq__brand { aspect-ratio: 16 / 10; }
  .nv-hq__needs { grid-template-columns: 1fr; }
  .nv-hq__stages { grid-template-columns: 1fr 1fr; }
}
    `}</style>
  );
}

// Compatibilidad: el repo importa el Home como `{ HeroQuiz }` (named).
// Exponemos también default para flexibilidad.
export default HeroQuiz;
