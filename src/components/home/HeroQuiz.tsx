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

export default function HeroQuiz({ needs, isLoggedIn = false }: HeroQuizProps) {
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

        {/* Columna derecha: composición de marca */}
        <div className="nv-hq__right" aria-hidden="true">
          <div className="nv-hq__brand">
            <Image
              src="/home/naturalvita-hero.avif"
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
              className="nv-hq__brand-img"
            />
            <div className="nv-hq__brand-badge">
              <span className="nv-hq__brand-badge-num">+299</span>
              <span className="nv-hq__brand-badge-lbl">productos seleccionados</span>
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
.nv-hq { background: linear-gradient(180deg,#FFFFFF 0%,#FAF7F2 100%); }
.nv-hq__inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
  min-height: 62vh; display: grid; grid-template-columns: 1.05fr 0.95fr;
  gap: 48px; align-items: center;
}
.nv-hq__left { padding: 40px 0; }
.nv-hq__eyebrow {
  font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #1E7D2E; font-weight: 600; margin: 0 0 12px;
}
.nv-hq__headline {
  font-family: Georgia, 'Times New Roman', serif; font-weight: 400;
  font-size: clamp(28px, 4vw, 44px); line-height: 1.12; color: #2A2722;
  margin: 0 0 24px; letter-spacing: -0.5px;
}
.nv-hq__headline-accent { color: #5C5048; }
.nv-hq__steps { display: flex; gap: 8px; margin-bottom: 20px; }
.nv-hq__dot {
  width: 28px; height: 4px; border-radius: 2px; background: #E8DFD0; transition: background .25s;
}
.nv-hq__dot.is-active { background: #4A2E9A; }
.nv-hq__dot.is-done { background: #1E7D2E; }
.nv-hq__panel { animation: nv-hq-fade .3s ease; }
@keyframes nv-hq-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.nv-hq__q {
  font-family: Georgia, serif; font-weight: 400; font-size: 22px; color: #2A2722; margin: 0 0 6px;
}
.nv-hq__q-sub { font-size: 14px; color: #8B8881; margin: 0 0 18px; }
.nv-hq__q-sub strong { color: #4A2E9A; font-weight: 600; }
.nv-hq__needs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;
}
.nv-hq__need {
  text-align: left; background: #FFFFFF; border: 1px solid #E8DFD0; border-radius: 14px;
  padding: 14px 16px; cursor: pointer; transition: all .18s; display: flex; flex-direction: column; gap: 3px;
}
.nv-hq__need:hover { border-color: #4A2E9A; box-shadow: 0 4px 16px rgba(74,46,154,.08); transform: translateY(-1px); }
.nv-hq__need-name { font-size: 14.5px; font-weight: 600; color: #2A2722; }
.nv-hq__need-tag { font-size: 12px; color: #8B8881; line-height: 1.3; }
.nv-hq__stages { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 16px; }
.nv-hq__stage {
  text-align: center; background: #FFFFFF; border: 1px solid #E8DFD0; border-radius: 14px;
  padding: 14px 8px; cursor: pointer; transition: all .18s; display: flex; flex-direction: column; gap: 2px;
}
.nv-hq__stage:hover { border-color: #1E7D2E; box-shadow: 0 4px 16px rgba(30,125,46,.08); transform: translateY(-1px); }
.nv-hq__stage-label { font-size: 14px; font-weight: 600; color: #2A2722; }
.nv-hq__stage-hint { font-size: 11px; color: #8B8881; }
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
.nv-hq__cards { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.nv-hq__card {
  display: flex; gap: 14px; align-items: center; background: #FFFFFF; border: 1px solid #E8DFD0;
  border-radius: 14px; padding: 12px; text-decoration: none; transition: all .18s;
}
.nv-hq__card:hover { border-color: #4A2E9A; box-shadow: 0 6px 20px rgba(74,46,154,.10); transform: translateY(-1px); }
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
.nv-hq__brand {
  position: relative; width: 100%; aspect-ratio: 4 / 5; border-radius: 24px; overflow: hidden;
  background: #F5F1E8;
}
.nv-hq__brand-img { object-fit: cover; }
.nv-hq__brand-badge {
  position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,.94);
  backdrop-filter: blur(6px); border-radius: 14px; padding: 12px 16px; display: flex;
  flex-direction: column; box-shadow: 0 6px 24px rgba(42,39,34,.12);
}
.nv-hq__brand-badge-num { font-family: Georgia, serif; font-size: 22px; color: #4A2E9A; line-height: 1; }
.nv-hq__brand-badge-lbl { font-size: 11px; color: #5C5048; margin-top: 3px; }
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
