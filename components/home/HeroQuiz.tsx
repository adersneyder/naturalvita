"use client";

/**
 * components/home/HeroQuiz.tsx
 *
 * Quiz-Hero del Home de NaturalVita. Sprint 2 Sesión A + Sesión B (punto 3).
 *
 * Flujo de 3 pasos:
 *   1. ¿Para quién? → elige etapa de vida (6 cards)
 *   2. ¿Qué quieres mejorar? → elige objetivo (filtrado según etapa)
 *   3. Resultado → fetch a /api/quiz/match, muestra 3 productos con razón IA
 *
 * Sesión B (punto 3) añade sobre el resultado:
 *   - Botón "Agregar" por producto → carrito (useCart.addItem), feedback "Agregado".
 *   - Botón "Ver" por producto → ficha rápida (modal QuickView, sin navegar,
 *     para no perder el resultado del quiz al volver).
 *   - Logueado: sin fricción de email (botón "Guardar mi selección").
 *   - Anónimo: form de email opcional + cupón.
 *
 * Disponibilidad: modelo de intermediación. Todo producto que llega al quiz
 * está activo (is_active), por tanto es pedible. El carrito usa stock_at_add
 * como tope; como no rastreamos stock visible, pasamos un tope alto y el
 * control real de cantidad vive en checkout.
 *
 * No usa Framer Motion ni Zustand (disciplina de dependencias del repo).
 */

import { useReducer, useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, X, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart/use-cart";
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
  presentation: string | null;
  shortDescription: string | null;
  laboratory: string | null;
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

// Tope de cantidad por línea cuando el producto no rastrea inventario.
// El control real (y el tope por stock, si el producto lo define) se aplica
// en la ficha de producto y en checkout.
const QUIZ_CART_MAX = 99;

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function HeroQuiz() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quickView, setQuickView] = useState<MatchedProduct | null>(null);

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
            onQuickView={(p) => setQuickView(p)}
          />
        )}

        {/* Escape al catálogo, siempre visible salvo tras suscribir */}
        {!state.subscribed && (
          <Link href="/tienda" className="nv-quiz__escape">
            Solo quiero ver el catálogo →
          </Link>
        )}
      </div>

      {quickView && (
        <QuickView product={quickView} onClose={() => setQuickView(null)} />
      )}

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
  onQuickView,
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
  onQuickView: (p: MatchedProduct) => void;
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
              <ProductRow key={p.id} product={p} onQuickView={onQuickView} />
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
// Fila de producto del resultado · con acciones Agregar + Ver
// ─────────────────────────────────────────────────────────────────────────────

function ProductRow({
  product,
  onQuickView,
}: {
  product: MatchedProduct;
  onQuickView: (p: MatchedProduct) => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = useCallback(() => {
    addItem({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      presentation: product.presentation,
      price_cop: product.priceCop,
      image_url: product.imageUrl,
      stock_at_add: QUIZ_CART_MAX,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }, [addItem, product]);

  return (
    <div className="nv-quiz__product">
      <button
        type="button"
        className="nv-quiz__product-main"
        onClick={() => onQuickView(product)}
        aria-label={`Ver ${product.name}`}
      >
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={64}
            height={64}
            className="nv-quiz__product-img"
          />
        )}
        <div className="nv-quiz__product-info">
          <span className="nv-quiz__product-name">{product.name}</span>
          <span className="nv-quiz__product-price">
            {formatCOP(product.priceCop)}
          </span>
          {product.reason && (
            <span className="nv-quiz__product-reason">{product.reason}</span>
          )}
        </div>
      </button>

      <div className="nv-quiz__product-actions">
        <button
          type="button"
          className={`nv-quiz__add ${added ? "nv-quiz__add--done" : ""}`}
          onClick={handleAdd}
          disabled={added}
          aria-label={`Agregar ${product.name} al carrito`}
        >
          {added ? (
            <>
              <Check size={15} /> Agregado
            </>
          ) : (
            <>
              <Plus size={15} /> Agregar
            </>
          )}
        </button>
        <button
          type="button"
          className="nv-quiz__view"
          onClick={() => onQuickView(product)}
        >
          Ver
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ficha rápida (modal) · sin navegar, preserva el resultado del quiz
// ─────────────────────────────────────────────────────────────────────────────

function QuickView({
  product,
  onClose,
}: {
  product: MatchedProduct;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  // Cerrar con Escape + bloquear scroll del fondo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function handleAdd() {
    addItem({
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      presentation: product.presentation,
      price_cop: product.priceCop,
      image_url: product.imageUrl,
      stock_at_add: QUIZ_CART_MAX,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div
      className="nv-qv__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={onClose}
    >
      <div className="nv-qv__panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="nv-qv__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="nv-qv__body">
          <div className="nv-qv__img-wrap">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={220}
                height={220}
                className="nv-qv__img"
              />
            ) : (
              <div className="nv-qv__img-placeholder">{product.name.charAt(0)}</div>
            )}
          </div>

          <div className="nv-qv__details">
            {product.laboratory && (
              <span className="nv-qv__lab">{product.laboratory}</span>
            )}
            <h2 className="nv-qv__name">{product.name}</h2>
            {product.presentation && (
              <p className="nv-qv__presentation">{product.presentation}</p>
            )}
            <p className="nv-qv__price">{formatCOP(product.priceCop)}</p>

            {product.shortDescription && (
              <p className="nv-qv__desc">{product.shortDescription}</p>
            )}

            {product.reason && (
              <p className="nv-qv__reason">
                <span className="nv-qv__reason-tag">Por qué te lo sugerimos</span>
                {product.reason}
              </p>
            )}

            <div className="nv-qv__actions">
              <button
                type="button"
                className={`nv-qv__add ${added ? "nv-qv__add--done" : ""}`}
                onClick={handleAdd}
                disabled={added}
              >
                {added ? (
                  <>
                    <Check size={17} /> Agregado al carrito
                  </>
                ) : (
                  <>
                    <ShoppingBag size={17} /> Agregar al carrito
                  </>
                )}
              </button>
              <Link href={`/producto/${product.slug}`} className="nv-qv__full">
                Ver ficha completa
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <QuickViewStyles />
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
        align-items: stretch;
        gap: 8px;
        padding: 10px 12px;
        background: #FFFFFF;
        border: 1px solid #E8DFD0;
        border-radius: 12px;
        transition: border-color 0.18s, box-shadow 0.18s;
      }
      .nv-quiz__product:hover {
        border-color: #C77D6D;
        box-shadow: 0 6px 18px rgba(199, 125, 109, 0.12);
      }
      .nv-quiz__product-main {
        flex: 1;
        display: flex;
        gap: 14px;
        align-items: center;
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        min-width: 0;
      }
      .nv-quiz__product-img { border-radius: 8px; object-fit: cover; flex-shrink: 0; }
      .nv-quiz__product-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
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
      .nv-quiz__product-actions {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .nv-quiz__add {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 8px 14px;
        background: #4A2E9A;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.18s;
        white-space: nowrap;
      }
      .nv-quiz__add:hover:not(:disabled) { background: #3B248A; }
      .nv-quiz__add--done { background: #1E7D2E; cursor: default; }
      .nv-quiz__view {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 14px;
        background: #FFFFFF;
        color: #4A2E9A;
        border: 1px solid #E8DFD0;
        border-radius: 8px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: border-color 0.18s, background 0.18s;
      }
      .nv-quiz__view:hover { border-color: #4A2E9A; background: #F3EEFB; }
      @media (max-width: 480px) {
        .nv-quiz__product { flex-direction: column; }
        .nv-quiz__product-actions { flex-direction: row; }
        .nv-quiz__add, .nv-quiz__view { flex: 1; }
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

// ─────────────────────────────────────────────────────────────────────────────
// Estilos de la ficha rápida (modal)
// ─────────────────────────────────────────────────────────────────────────────

function QuickViewStyles() {
  return (
    <style>{`
      .nv-qv__overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(42, 39, 34, 0.55);
        backdrop-filter: blur(3px);
        animation: nvQvFade 0.2s ease;
      }
      @keyframes nvQvFade { from { opacity: 0; } to { opacity: 1; } }
      .nv-qv__panel {
        position: relative;
        width: 100%;
        max-width: 560px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: #FFFFFF;
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(42, 39, 34, 0.25);
        animation: nvQvPanel 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes nvQvPanel {
        from { opacity: 0; transform: translateY(16px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .nv-qv__overlay, .nv-qv__panel { animation: none; }
      }
      .nv-qv__close {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 2;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #FFFFFF;
        border: 1px solid #E8DFD0;
        border-radius: 50%;
        color: #6B6760;
        cursor: pointer;
        transition: background 0.18s, color 0.18s;
      }
      .nv-qv__close:hover { background: #F5F1E8; color: #2A2722; }
      .nv-qv__body {
        display: flex;
        gap: 24px;
        padding: 28px;
      }
      @media (max-width: 560px) {
        .nv-qv__body { flex-direction: column; gap: 16px; padding: 24px 20px; }
      }
      .nv-qv__img-wrap {
        flex-shrink: 0;
        width: 200px;
        height: 200px;
        border-radius: 14px;
        background: #FAF7F2;
        border: 1px solid #E8DFD0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      @media (max-width: 560px) {
        .nv-qv__img-wrap { width: 100%; height: 200px; }
      }
      .nv-qv__img { object-fit: contain; padding: 12px; width: auto; height: auto; max-width: 100%; max-height: 100%; }
      .nv-qv__img-placeholder {
        font-family: Georgia, serif;
        font-size: 56px;
        color: rgba(74, 46, 154, 0.2);
      }
      .nv-qv__details { flex: 1; min-width: 0; text-align: left; }
      .nv-qv__lab {
        display: inline-block;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #1E7D2E;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .nv-qv__name {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 22px;
        font-weight: 400;
        color: #2A2722;
        line-height: 1.25;
        margin: 0 0 4px;
      }
      .nv-qv__presentation {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #8B8881;
        margin: 0 0 10px;
      }
      .nv-qv__price {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        font-weight: 700;
        color: #1E7D2E;
        margin: 0 0 14px;
      }
      .nv-qv__desc {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        color: #5C5048;
        line-height: 1.6;
        margin: 0 0 14px;
      }
      .nv-qv__reason {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        color: #6B6760;
        line-height: 1.55;
        background: #F3EEFB;
        border-radius: 10px;
        padding: 12px 14px;
        margin: 0 0 18px;
      }
      .nv-qv__reason-tag {
        display: block;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #4A2E9A;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .nv-qv__actions { display: flex; flex-direction: column; gap: 10px; }
      .nv-qv__add {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 13px 20px;
        background: #4A2E9A;
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.18s;
      }
      .nv-qv__add:hover:not(:disabled) { background: #3B248A; }
      .nv-qv__add--done { background: #1E7D2E; cursor: default; }
      .nv-qv__full {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: #4A2E9A;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        padding: 4px;
      }
      .nv-qv__full:hover { text-decoration: underline; }
    `}</style>
  );
}
