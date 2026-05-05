import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeFromNewsletter } from "@/lib/newsletter/queries";

export const metadata: Metadata = {
  title: "Cancelar suscripción · NaturalVita",
  description: "Procesa la cancelación de tu suscripción al newsletter.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Página de desuscripción accedida desde el link único en cada email.
 *
 * Diseño: opt-out en un solo click (sin necesidad de confirmación adicional)
 * porque el token único en URL ya prueba que el usuario tiene acceso al
 * email asociado. Pedir confirmación es solo añadir fricción para algo
 * legalmente requerido.
 *
 * Idempotente: si ya está desuscrito, mostramos el mismo mensaje exitoso.
 */
export default async function DesuscribirPage({ params }: PageProps) {
  const { token } = await params;
  const result = await unsubscribeFromNewsletter(token);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {result.ok ? (
          <>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-leaf-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-leaf-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-leaf-900 mb-3">
              Suscripción cancelada
            </h1>
            <p className="text-earth-700 leading-relaxed mb-2">
              {result.email
                ? `${result.email} no recibirá más correos del newsletter de NaturalVita.`
                : "Procesamos tu cancelación correctamente."}
            </p>
            <p className="text-sm text-earth-500 mb-8">
              Seguirás recibiendo correos transaccionales sobre tus pedidos
              activos, pero no notificaciones de marketing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/tienda"
                className="px-6 py-3 rounded-lg bg-iris-700 text-white text-sm font-medium hover:bg-iris-600 transition-colors"
              >
                Volver a la tienda
              </Link>
              <Link
                href="/contacto"
                className="px-6 py-3 rounded-lg border border-earth-200 text-earth-700 text-sm font-medium hover:bg-earth-50 transition-colors"
              >
                Cuéntanos por qué
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-earth-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-earth-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-leaf-900 mb-3">
              No pudimos procesar
            </h1>
            <p className="text-earth-700 leading-relaxed mb-8">
              {result.error ??
                "El enlace de cancelación no es válido o ya fue procesado."}{" "}
              Si necesitas ayuda, escríbenos a pedidos@naturalvita.co.
            </p>
            <Link
              href="/contacto"
              className="inline-block px-6 py-3 rounded-lg bg-iris-700 text-white text-sm font-medium hover:bg-iris-600 transition-colors"
            >
              Contactar
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
