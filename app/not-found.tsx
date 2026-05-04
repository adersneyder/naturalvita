import Link from "next/link";

export const metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-iris-700)] font-medium mb-4">
          Error 404
        </p>
        <h1 className="font-serif text-4xl md:text-6xl text-[var(--color-leaf-900)] tracking-tight leading-[1.05] mb-5">
          No encontramos esta página
        </h1>
        <p className="text-base text-[var(--color-earth-700)] leading-relaxed max-w-lg mx-auto mb-10">
          La dirección que buscas pudo cambiar, expirar o nunca haber existido.
          Tranquilo, te llevamos de vuelta a algo útil.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tienda"
            className="px-6 py-3 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)]"
          >
            Ir a la tienda
          </Link>
          <Link
            href="/buscar"
            className="px-6 py-3 rounded-lg bg-white border border-[var(--color-earth-100)] text-sm font-medium text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
          >
            Buscar productos
          </Link>
          <Link
            href="/contacto"
            className="px-6 py-3 rounded-lg bg-white border border-[var(--color-earth-100)] text-sm font-medium text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)]"
          >
            Contáctanos
          </Link>
        </div>

        <p className="mt-12 text-sm text-[var(--color-earth-700)]">
          ¿Llegaste aquí desde un enlace que enviamos nosotros?{" "}
          <Link
            href="/contacto"
            className="text-[var(--color-iris-700)] hover:underline"
          >
            Avísanos
          </Link>{" "}
          y lo arreglamos.
        </p>
      </div>
    </div>
  );
}
