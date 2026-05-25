"use client";

/**
 * components/home/HeroQuiz.tsx
 *
 * Quiz-Hero del Home de NaturalVita. Sprint 2 Sesión A.
 *
 * Flujo de 3 pasos:
 *   1. ¿Para quién? → elige etapa de vida (6 cards)
 *   2. ¿Qué quieres mejorar? → elige objetivo (filtrado según etapa)
 *   3. Resultado → fetch a /api/quiz/match, muestra 3 productos con razón IA
 *      + captura email (server action) → cupón WELCOME10
 *
 * Diseño:
 *   - Estado con useReducer (sin librerías externas)
 *   - Transiciones CSS suaves entre pasos, respeta prefers-reduced-motion
 *   - Escape "solo ver catálogo" siempre visible
 *   - Estética cálida, serif Fraunces para titulares
 *
 * No usa Framer Motion ni Zustand (disciplina de dependencias del repo).
 */

import { useReducer, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  STAGES,
  goalsForStage,
  getStage,
  getGoal,
  type StageOption,
  type GoalOption,
} from "./quiz-data";
import { quizSubscribeAction, type QuizSubscribeState } from "@/app/_actions/quiz-subscribe";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de estado
// ─────────────────────────────────────────────────────────────────────────────

interface MatchedProduct {
  id: string;
  name: string;
  slug: string;
  priceCop: number;
  imageUrl: string | null;
  reason: string;
}

type Step = "stage" | "goal" | "result";

interface State {
  step: Step;
  etapa: string | null;
  objetivo: string | null;
  loading: boolean;
  products: MatchedProduct[];
  matchError: boolean;
  subscribed: boolean;
  resultUrl?: string;
}

type Action =
  | { type: "PICK_STAGE"; etapa: string }
  | { type: "PICK_GOAL"; objetivo: string }
  | { type: "BACK" }
  | { type: "MATCH_START" }
  | { type: "MATCH_SUCCESS"; products: MatchedProduct[] }
  | { type: "MATCH_ERROR" }
  | { type: "SUBSCRIBED"; resultUrl?: string }
  | { type: "RESET" };

const initialState: State = {
  step: "stage",
  etapa: null,
  objetivo: null,
  loading: false,
  products: [],
  matchError: false,
  subscribed: false,
  resultUrl: undefined,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "PICK_STAGE":
      return { ...state, etapa: action.etapa, step: "goal" };
    case "PICK_GOAL":
      return { ...state, objetivo: action.objetivo, step: "result" };
    case "BACK":
      if (state.step === "goal") return { ...state, step: "stage", objetivo: null };
      if (state.step === "result")
        return { ...state, step: "goal", products: [], matchError: false };
      return state;
    case "MATCH_START":
      return { ...state, loading: true, matchError: false };
    case "MATCH_SUCCESS":
      return { ...state, loading: false, products: action.products };
    case "MATCH_ERROR":
      return { ...state, loading: false, matchError: true };
    case "SUBSCRIBED":
      return { ...state, subscribed: true, resultUrl: action.resultUrl };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function HeroQuiz() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Detectar sesión del lado del cliente. Esto mantiene el Home estático
  // (no fuerza render dinámico por cookies), óptimo para SEO y LCP. El quiz
  // se ajusta cuando se confirma la sesión, sin bloquear el render inicial.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsLoggedIn(Boolean(data.user));
    });
    return () => {
      active = false;
    };
  }, []);

  // Cuando entra al paso resultado, dispara el match
  async function handlePickGoal(objetivo: string) {
    dispatch({ type: "PICK_GOAL", objetivo });
    dispatch({ type: "MATCH_START" });
    try {
      const res = await fetch("/api/quiz/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: state.etapa, objetivo }),
      });
      if (!res.ok) throw new Error("match failed");
      const data = await res.json();
      dispatch({ type: "MATCH_SUCCESS", products: data.products ?? [] });
    } catch {
      dispatch({ type: "MATCH_ERROR" });
    }
  }

  return (
    <section className="nv-quiz" aria-label="Encuentra tu bienestar">
      <div className="nv-quiz__inner">
        {/* Eyebrow + headline fijos */}
        <p className="nv-quiz__eyebrow">Bienestar que crece contigo</p>

        {state.step === "stage" && (
          <StageStep onPick={(etapa) => dispatch({ type: "PICK_STAGE", etapa })} />
        )}

        {state.step === "goal" && state.etapa && (
          <GoalStep
            etapa={state.etapa}
            onPick={handlePickGoal}
            onBack={() => dispatch({ type: "BACK" })}
          />
        )}

        {state.step === "result" && state.etapa && state.objetivo && (
          <ResultStep
            etapa={state.etapa}
            objetivo={state.objetivo}
            loading={state.loading}
            products={state.products}
            matchError={state.matchError}
            subscribed={state.subscribed}
            resultUrl={state.resultUrl}
            isLoggedIn={isLoggedIn}
            onBack={() => dispatch({ type: "BACK" })}
            onSubscribed={(resultUrl) =>
              dispatch({ type: "SUBSCRIBED", resultUrl })
            }
          />
        )}

        {/* Escape al catálogo, siempre visible salvo tras suscribir */}
        {!state.subscribed && (
          <Link href="/tienda" className="nv-quiz__escape">
            Solo quiero ver el catálogo →
          </Link>
        )}
      </div>

      <QuizStyles />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paso 1 · Etapa
// ─────────────────────────────────────────────────────────────────────────────

function StageStep({ onPick }: { onPick: (etapa: string) => void }) {
  return (
    <div className="nv-quiz__step">
      <h1 className="nv-quiz__question">¿Para quién buscas bienestar hoy?</h1>
      <div className="nv-quiz__grid">
        {STAGES.map((stage) => (
          <OptionCard
            key={stage.id}
            icon={<stage.icon size={26} strokeWidth={1.6} />}
            label={stage.label}
            hint={stage.hint}
            onClick={() => onPick(stage.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paso 2 · Objetivo
// ─────────────────────────────────────────────────────────────────────────────

function GoalStep({
  etapa,
  onPick,
  onBack,
}: {
  etapa: string;
  onPick: (objetivo: string) => void;
  onBack: () => void;
}) {
  const stage = getStage(etapa);
  const goals = goalsForStage(etapa);

  return (
    <div className="nv-quiz__step">
      <button className="nv-quiz__back" onClick={onBack} type="button">
        <ArrowLeft size={16} /> {stage?.label}
      </button>
      <h1 className="nv-quiz__question">¿Qué te gustaría mejorar?</h1>
      <div className="nv-quiz__grid">
        {goals.map((goal) => (
          <OptionCard
            key={goal.id}
            icon={<goal.icon size={26} strokeWidth={1.6} />}
            label={goal.label}
            hint={goal.hint}
            onClick={() => onPick(goal.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paso 3 · Resultado
// ─────────────────────────────────────────────────────────────────────────────

function ResultStep({
  etapa,
  objetivo,
  loading,
  products,
  matchError,
  subscribed,
  resultUrl,
  isLoggedIn,
  onBack,
  onSubscribed,
}: {
  etapa: string;
  objetivo: string;
  loading: boolean;
  products: MatchedProduct[];
  matchError: boolean;
  subscribed: boolean;
  resultUrl?: string;
  isLoggedIn: boolean;
  onBack: () => void;
  onSubscribed: (resultUrl?: string) => void;
}) {
  const stage = getStage(etapa);
  const goal = getGoal(objetivo);

  return (
    <div className="nv-quiz__step nv-quiz__step--result">
      <button className="nv-quiz__back" onClick={onBack} type="button">
        <ArrowLeft size={16} /> {goal?.label}
      </button>

      {loading && (
        <div className="nv-quiz__loading">
          <Loader2 className="nv-quiz__spin" size={28} />
          <p>Seleccionando lo mejor para {stage?.label.toLowerCase()}…</p>
        </div>
      )}

      {!loading && matchError && (
        <div className="nv-quiz__loading">
          <p>No pudimos generar recomendaciones ahora.</p>
          <Link href="/tienda" className="nv-quiz__cta">
            Ver el catálogo completo
          </Link>
        </div>
      )}

      {!loading && !matchError && products.length > 0 && (
        <>
          <h1 className="nv-quiz__question nv-quiz__question--sm">
            Esto seleccionamos para ti
          </h1>
          <div className="nv-quiz__products">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/producto/${p.slug}`}
                className="nv-quiz__product"
              >
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="nv-quiz__product-img"
                  />
                )}
                <div className="nv-quiz__product-info">
                  <span className="nv-quiz__product-name">{p.name}</span>
                  <span className="nv-quiz__product-price">
                    {formatCOP(p.priceCop)}
                  </span>
                  {p.reason && (
                    <span className="nv-quiz__product-reason">{p.reason}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {!subscribed ? (
            <CaptureForm
              etapa={etapa}
              objetivo={objetivo}
              products={products}
              isLoggedIn={isLoggedIn}
              onSubscribed={onSubscribed}
            />
          ) : (
            <div className="nv-quiz__success">
              <Check size={20} />
              <span>
                {isLoggedIn
                  ? "¡Guardamos tu selección! La encuentras en tu correo o aquí abajo."
                  : "¡Listo! Te enviamos la selección y tu cupón de bienvenida."}
              </span>
            </div>
          )}

          {subscribed && resultUrl && (
            <a href={resultUrl} className="nv-quiz__see-more" style={{ marginBottom: "8px" }}>
              Ver tu selección guardada
              <ArrowRight size={15} />
            </a>
          )}

          <Link
            href={`/tienda?etapa=${etapa}&objetivo=${objetivo}`}
            className="nv-quiz__see-more"
          >
            Ver todos los productos para {stage?.label.toLowerCase()}
            <ArrowRight size={15} />
          </Link>
        </>
      )}

      {!loading && !matchError && products.length === 0 && (
        <div className="nv-quiz__loading">
          <p>No encontramos productos para esta combinación todavía.</p>
          <Link href="/tienda" className="nv-quiz__cta">
            Explorar el catálogo
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form de captura de email
// ─────────────────────────────────────────────────────────────────────────────

function CaptureForm({
  etapa,
  objetivo,
  products,
  isLoggedIn,
  onSubscribed,
}: {
  etapa: string;
  objetivo: string;
  products: MatchedProduct[];
  isLoggedIn: boolean;
  onSubscribed: (resultUrl?: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitForm(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const initial: QuizSubscribeState = { ok: false, message: "" };
      const result = await quizSubscribeAction(initial, fd);
      if (result.ok) {
        onSubscribed(result.resultUrl);
      } else {
        setError(result.message || "No pudimos guardar tu selección.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm(new FormData(e.currentTarget));
  }

  function handleSaveClick() {
    const fd = new FormData();
    fd.set("etapa", etapa);
    fd.set("objetivo", objetivo);
    fd.set("products", JSON.stringify(products));
    submitForm(fd);
  }

  // Usuario logueado: sin fricción, botón directo para guardar (no pedimos
  // el email que ya tenemos en su cuenta).
  if (isLoggedIn) {
    return (
      <div className="nv-quiz__form">
        <p className="nv-quiz__form-label">
          Guarda esta selección en tu cuenta para volver cuando quieras
        </p>
        <button
          type="button"
          className="nv-quiz__submit nv-quiz__submit--full"
          onClick={handleSaveClick}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="nv-quiz__spin" size={18} /> : "Guardar mi selección"}
        </button>
        {error && <p className="nv-quiz__error">{error}</p>}
      </div>
    );
  }

  // Usuario anónimo: form de email (opcional — ya vio el resultado en pantalla)
  return (
    <form className="nv-quiz__form" onSubmit={handleSubmit}>
      <p className="nv-quiz__form-label">
        Te enviamos esta selección y un cupón de bienvenida del 10%
      </p>
      <input type="hidden" name="etapa" value={etapa} />
      <input type="hidden" name="objetivo" value={objetivo} />
      <input type="hidden" name="products" value={JSON.stringify(products)} />
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="nv-quiz__honeypot"
      />
      <div className="nv-quiz__form-row">
        <input
          type="email"
          name="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="nv-quiz__input"
          disabled={isPending}
        />
        <button type="submit" className="nv-quiz__submit" disabled={isPending}>
          {isPending ? <Loader2 className="nv-quiz__spin" size={18} /> : "Recibir"}
        </button>
      </div>
      {error && <p className="nv-quiz__error">{error}</p>}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de opción reutilizable
// ─────────────────────────────────────────────────────────────────────────────

function OptionCard({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="nv-quiz__option" onClick={onClick}>
      <span className="nv-quiz__option-icon">{icon}</span>
      <span className="nv-quiz__option-label">{label}</span>
      <span className="nv-quiz__option-hint">{hint}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos scoped (CSS-in-JS simple via <style>)
// ─────────────────────────────────────────────────────────────────────────────

function QuizStyles() {
  return (
    <style>{`
      .nv-quiz {
        min-height: calc(100vh - 80px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        background:
          radial-gradient(ellipse 80% 60% at 50% 0%, #F3EEE4 0%, transparent 70%),
          linear-gradient(180deg, #FAF7F2 0%, #F5F1E8 100%);
      }
      .nv-quiz__inner {
        width: 100%;
        max-width: 760px;
        text-align: center;
      }
      .nv-quiz__eyebrow {
        font-family: Georgia, serif;
        font-size: 14px;
        letter-spacing: 0.5px;
        color: #4A2E9A;
        margin: 0 0 28px;
        opacity: 0.85;
      }
      .nv-quiz__step {
        animation: nvFade 0.4s ease;
      }
      @keyframes nvFade {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .nv-quiz__step { animation: none; }
      }
      .nv-quiz__question {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 400;
        line-height: 1.15;
        color: #2A2722;
        margin: 0 0 32px;
        letter-spacing: -0.5px;
      }
      .nv-quiz__question--sm {
        font-size: clamp(24px, 4vw, 34px);
        margin-bottom: 24px;
      }
      .nv-quiz__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }
      @media (max-width: 640px) {
        .nv-quiz__grid { grid-template-columns: repeat(2, 1fr); }
      }
      .nv-quiz__option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 24px 16px;
        background: #FFFFFF;
        border: 1px solid #E8DFD0;
        border-radius: 16px;
        cursor: pointer;
        transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        font-family: inherit;
      }
      .nv-quiz__option:hover {
        transform: translateY(-3px);
        border-color: #C77D6D;
        box-shadow: 0 8px 24px rgba(199, 125, 109, 0.15);
      }
      .nv-quiz__option:focus-visible {
        outline: 2px solid #4A2E9A;
        outline-offset: 2px;
      }
      .nv-quiz__option-icon {
        color: #4A2E9A;
        background: #F3EEFB;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nv-quiz__option-label {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        font-weight: 600;
        color: #2A2722;
      }
      .nv-quiz__option-hint {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #8B8881;
      }
      .nv-quiz__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: none;
        color: #8B8881;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        cursor: pointer;
        margin-bottom: 16px;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .nv-quiz__back:hover { color: #4A2E9A; background: #F3EEFB; }
      .nv-quiz__escape {
        display: inline-block;
        margin-top: 32px;
        color: #8B8881;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: color 0.18s, border-color 0.18s;
      }
      .nv-quiz__escape:hover { color: #4A2E9A; border-color: #4A2E9A; }
      .nv-quiz__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 48px 0;
        color: #6B6760;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
      }
      .nv-quiz__spin { animation: nvSpin 0.9s linear infinite; color: #4A2E9A; }
      @keyframes nvSpin { to { transform: rotate(360deg); } }
      .nv-quiz__products {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 24px;
      }
      .nv-quiz__product {
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 14px;
        background: #FFFFFF;
        border: 1px solid #E8DFD0;
        border-radius: 12px;
        text-decoration: none;
        text-align: left;
        transition: border-color 0.18s, box-shadow 0.18s;
      }
      .nv-quiz__product:hover {
        border-color: #C77D6D;
        box-shadow: 0 6px 18px rgba(199, 125, 109, 0.12);
      }
      .nv-quiz__product-img { border-radius: 8px; object-fit: cover; flex-shrink: 0; }
      .nv-quiz__product-info { display: flex; flex-direction: column; gap: 2px; }
      .nv-quiz__product-name {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        font-weight: 600;
        color: #2A2722;
      }
      .nv-quiz__product-price {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #1E7D2E;
      }
      .nv-quiz__product-reason {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12.5px;
        color: #8B8881;
        font-style: italic;
        margin-top: 2px;
      }
      .nv-quiz__form {
        background: #FFFFFF;
        border: 1px solid #E8DFD0;
        border-radius: 14px;
        padding: 18px;
        margin-bottom: 16px;
      }
      .nv-quiz__form-label {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13.5px;
        color: #6B6760;
        margin: 0 0 12px;
      }
      .nv-quiz__form-row { display: flex; gap: 8px; }
      .nv-quiz__honeypot {
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
      .nv-quiz__input {
        flex: 1;
        padding: 12px 14px;
        border: 1px solid #E8DFD0;
        border-radius: 9px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        color: #2A2722;
      }
      .nv-quiz__input:focus {
        outline: none;
        border-color: #4A2E9A;
        box-shadow: 0 0 0 3px #F3EEFB;
      }
      .nv-quiz__submit {
        padding: 12px 22px;
        background: #4A2E9A;
        color: #FFFFFF;
        border: none;
        border-radius: 9px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 92px;
        transition: background 0.18s;
      }
      .nv-quiz__submit:hover:not(:disabled) { background: #3B248A; }
      .nv-quiz__submit:disabled { opacity: 0.7; cursor: default; }
      .nv-quiz__submit--full { width: 100%; padding: 13px 22px; }
      .nv-quiz__error {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #B91C1C;
        margin: 10px 0 0;
      }
      .nv-quiz__success {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        background: #E5F1E7;
        color: #1E7D2E;
        border-radius: 12px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .nv-quiz__see-more, .nv-quiz__cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #4A2E9A;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
      }
      .nv-quiz__see-more:hover, .nv-quiz__cta:hover { text-decoration: underline; }
      .nv-quiz__cta {
        margin-top: 12px;
        padding: 11px 24px;
        background: #4A2E9A;
        color: #FFFFFF;
        border-radius: 9px;
      }
      .nv-quiz__cta:hover { background: #3B248A; text-decoration: none; }
    `}</style>
  );
}
