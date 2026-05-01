import Link from "next/link";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-[var(--color-leaf-900)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2c-2 4-6 6-6 11a6 6 0 0012 0c0-5-4-7-6-11z"
                  fill="white"
                  opacity="0.9"
                />
              </svg>
            </span>
            <span className="font-serif text-lg">NaturalVita</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Tienda online de productos naturales en Colombia. Una marca de Everlife Colombia.
          </p>
        </div>

        {/* Catálogo */}
        <div>
          <h3 className="font-serif text-sm uppercase tracking-wider text-white/60 mb-3 m-0">
            Catálogo
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/tienda" className="text-white/85 hover:text-white">
                Toda la tienda
              </Link>
            </li>
            <li>
              <Link href="/colecciones" className="text-white/85 hover:text-white">
                Colecciones
              </Link>
            </li>
            <li>
              <Link href="/laboratorios" className="text-white/85 hover:text-white">
                Laboratorios
              </Link>
            </li>
          </ul>
        </div>

        {/* Atención */}
        <div>
          <h3 className="font-serif text-sm uppercase tracking-wider text-white/60 mb-3 m-0">
            Atención
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/contacto" className="text-white/85 hover:text-white">
                Contacto
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" className="text-white/85 hover:text-white">
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link href="/envios-y-devoluciones" className="text-white/85 hover:text-white">
                Envíos y devoluciones
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-serif text-sm uppercase tracking-wider text-white/60 mb-3 m-0">
            Legal
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terminos" className="text-white/85 hover:text-white">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="text-white/85 hover:text-white">
                Tratamiento de datos
              </Link>
            </li>
            <li>
              <Link href="/aviso-invima" className="text-white/85 hover:text-white">
                Aviso INVIMA
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Línea inferior */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-white/60">
          <p className="m-0">
            © {year} NaturalVita · Una marca de Everlife Colombia. Todos los derechos reservados.
          </p>
          <p className="m-0">Productos sujetos a Resoluciones INVIMA aplicables.</p>
        </div>
      </div>
    </footer>
  );
}
