import Link from "next/link";
import {
  COMPANY,
  REGULATORY,
  getFormattedAddress,
} from "@/lib/legal/company-info";
import { NewsletterForm } from "./NewsletterForm";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  // Render condicional de redes sociales como elementos JSX
  // construidos antes del return para evitar JSX inline complejo.
  const socialLinks: React.ReactNode[] = [];

  if (COMPANY.social.instagram) {
    socialLinks.push(
      <li key="instagram">
        
          href={COMPANY.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white"
          aria-label="Instagram"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </a>
      </li>,
    );
  }

  if (COMPANY.social.facebook) {
    socialLinks.push(
      <li key="facebook">
        
          href={COMPANY.social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white"
          aria-label="Facebook"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
      </li>,
    );
  }

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
            <span className="font-serif text-lg">{COMPANY.brand}</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            {COMPANY.tagline}. Una marca de {COMPANY.parentBrand}.
          </p>

          {socialLinks.length > 0 && (
            <ul className="mt-4 flex gap-3">{socialLinks}</ul>
          )}
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
              <Link href="/buscar" className="text-white/85 hover:text-white">
                Buscar productos
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="text-white/85 hover:text-white">
                Mi carrito
              </Link>
            </li>
            <li>
              <Link
                href="/mi-cuenta"
                className="text-white/85 hover:text-white"
              >
                Mi cuenta
              </Link>
            </li>
          </ul>
        </div>

        {/* Soporte */}
        <div>
          <h3 className="font-serif text-sm uppercase tracking-wider text-white/60 mb-3 m-0">
            Soporte
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/sobre-nosotros"
                className="text-white/85 hover:text-white"
              >
                Sobre nosotros
              </Link>
            </li>
            <li>
              <Link
                href="/preguntas-frecuentes"
                className="text-white/85 hover:text-white"
              >
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link
                href="/contacto"
                className="text-white/85 hover:text-white"
              >
                Contacto
              </Link>
            </li>
            <li>
              <Link
                href="/legal/envios"
                className="text-white/85 hover:text-white"
              >
                Envíos y devoluciones
              </Link>
            </li>
            <li className="text-white/60 text-xs pt-1 leading-relaxed">
              {COMPANY.email.public}
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
              <Link
                href="/legal/privacidad"
                className="text-white/85 hover:text-white"
              >
                Política de datos
              </Link>
            </li>
            <li>
              <Link
                href="/legal/terminos"
                className="text-white/85 hover:text-white"
              >
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link
                href="/legal/envios"
                className="text-white/85 hover:text-white"
              >
                Política de envíos
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Newsletter signup */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="md:max-w-md">
            <h3 className="font-serif text-lg mb-1">
              Recibe novedades y ofertas
            </h3>
            <p className="text-xs text-white/65 leading-relaxed">
              Suscríbete y recibe un cupón de bienvenida para tu primera
              compra. Sin spam, puedes cancelar cuando quieras.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Bottom bar con datos legales */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-white/55">
          <div>
            <p>
              © {year} {COMPANY.legalName}
            </p>
            <p className="mt-1">{getFormattedAddress()}</p>
            <p className="mt-1">{REGULATORY.shortDisclaimer}</p>
          </div>
          <p className="md:text-right">
            Pagos seguros con Bold · Despachos a toda Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
