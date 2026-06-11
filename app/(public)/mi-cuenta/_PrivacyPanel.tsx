"use client";

import Link from "next/link";
import { useState } from "react";
import { clearConsent, useConsent, writeConsent } from "@/lib/cart/use-consent";
import { clearVisitorId } from "@/lib/savia/tracker";

/**
 * Panel "Privacidad" en /mi-cuenta. Permite:
 *   - Ver tu estado de consentimiento actual y actualizarlo.
 *   - Borrar el identificador anónimo de visitante (localStorage).
 *   - Ejercer derecho de eliminación de datos (Habeas Data, ley 1581/2012)
 *     por correo a {publicEmail} — el flujo es manual para mantener un
 *     control humano sobre solicitudes irrevocables.
 */
export default function PrivacyPanel() {
  const { state, isLoaded } = useConsent();
  const [feedback, setFeedback] = useState<string | null>(null);

  function setAnalytics(analytics: boolean) {
    writeConsent({
      analytics,
      marketing: state?.marketing ?? false,
    });
    setFeedback(
      analytics
        ? "Activaste la analítica. Empezaremos a enriquecer los eventos a partir de ahora."
        : "Desactivaste la analítica. Los eventos seguirán siendo anónimos.",
    );
  }

  function setMarketing(marketing: boolean) {
    writeConsent({
      analytics: state?.analytics ?? false,
      marketing,
    });
    setFeedback(
      marketing
        ? "Activaste comunicaciones de marketing. Te enviaremos recomendaciones cuando tengamos algo bueno."
        : "Desactivaste comunicaciones de marketing. Solo enviaremos correos transaccionales (confirmaciones de pedido y envío).",
    );
  }

  function resetConsent() {
    clearConsent();
    setFeedback("Volvimos a la primera visita: te mostraremos el banner de consentimiento de nuevo.");
  }

  function forgetVisitor() {
    clearVisitorId();
    setFeedback(
      "Borramos tu identificador anónimo. La próxima visita generará uno nuevo.",
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-serif text-xl text-[var(--color-leaf-900)] m-0">
          Tu privacidad
        </h2>
        <p className="text-sm text-[var(--color-earth-700)] mt-1 m-0">
          Controla cómo usamos tus datos. Más detalles en{" "}
          <Link
            href="/legal/privacidad"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            la política completa
          </Link>
          .
        </p>
      </header>

      {feedback && (
        <p className="text-xs text-[var(--color-leaf-700)] m-0 p-3 bg-[var(--color-leaf-100)]/60 rounded-lg">
          {feedback}
        </p>
      )}

      <div className="space-y-3">
        <PrefRow
          title="Analítica de comportamiento"
          desc="Nos permite vincular tu navegación con tu cuenta y enriquecer reportes con tu IP y ciudad estimada."
          enabled={Boolean(state?.analytics)}
          isLoaded={isLoaded}
          onToggle={setAnalytics}
        />
        <PrefRow
          title="Comunicaciones de marketing"
          desc="Recomendaciones, ofertas y novedades por email. Los correos transaccionales (pedidos) llegan siempre."
          enabled={Boolean(state?.marketing)}
          isLoaded={isLoaded}
          onToggle={setMarketing}
        />
      </div>

      <hr className="border-t border-[var(--color-earth-100)]" />

      <div>
        <h3 className="font-serif text-base text-[var(--color-leaf-900)] m-0">
          Borrar identificador anónimo
        </h3>
        <p className="text-xs text-[var(--color-earth-700)] mt-1 mb-3">
          Quita el identificador de visitante que guardamos en tu navegador.
          La próxima visita se contará como nueva. No borra los pedidos ni
          los datos de tu cuenta.
        </p>
        <button
          type="button"
          onClick={forgetVisitor}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)]"
        >
          Borrar identificador del navegador
        </button>
      </div>

      <div>
        <h3 className="font-serif text-base text-[var(--color-leaf-900)] m-0">
          Revisar consentimiento desde cero
        </h3>
        <p className="text-xs text-[var(--color-earth-700)] mt-1 mb-3">
          Volvemos a mostrarte el banner de consentimiento como si fuera tu
          primera visita. Útil si quieres reconfigurar todo a la vez.
        </p>
        <button
          type="button"
          onClick={resetConsent}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--color-earth-300)] text-[var(--color-earth-900)] hover:bg-[var(--color-earth-50)]"
        >
          Mostrar el banner de nuevo
        </button>
      </div>

      <hr className="border-t border-[var(--color-earth-100)]" />

      <div>
        <h3 className="font-serif text-base text-[var(--color-leaf-900)] m-0">
          Eliminar todos mis datos
        </h3>
        <p className="text-xs text-[var(--color-earth-700)] mt-1">
          Ejerces el derecho de supresión del artículo 8 de la Ley 1581 de
          2012. El proceso es manual para asegurar que la eliminación es
          intencional: escríbenos a{" "}
          <a
            href="mailto:hola@naturalvita.co?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            hola@naturalvita.co
          </a>{" "}
          con asunto &quot;Solicitud de eliminación de datos&quot; y
          respondemos en máximo 15 días hábiles.
        </p>
        <p className="text-[10px] text-[var(--color-earth-500)] mt-2 m-0">
          Nota: por obligaciones tributarias debemos conservar las
          transacciones por 5 años. Esto se anonimiza al eliminar tu
          cuenta — la factura queda, sin tu nombre.
        </p>
      </div>
    </section>
  );
}

function PrefRow({
  title,
  desc,
  enabled,
  isLoaded,
  onToggle,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  isLoaded: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-earth-100)] cursor-pointer hover:bg-[var(--color-earth-50)]/40">
      <input
        type="checkbox"
        checked={enabled}
        disabled={!isLoaded}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 w-4 h-4 accent-[var(--color-leaf-700)] cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
          {title}
        </p>
        <p className="text-xs text-[var(--color-earth-700)] mt-0.5 m-0">
          {desc}
        </p>
      </div>
    </label>
  );
}
