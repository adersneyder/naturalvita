import Link from "next/link";
import {
  COMPANY,
  getFormattedAddress,
} from "@/lib/legal/company-info";
import { NewsletterForm } from "./NewsletterForm";

function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
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
  );
}

function FacebookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramLink() {
  const url = COMPANY.social.instagram;
  if (!url) {
    return null;
  }
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/70 hover:text-white transition-colors"
        aria-label="Instagram"
      >
        <InstagramIcon />
      </a>
    </li>
  );
}

function FacebookLink() {
  const url = COMPANY.social.facebook;
  if (!url) {
    return null;
  }
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/70 hover:text-white transition-colors"
        aria-label="Facebook"
      >
        <FacebookIcon />
      </a>
    </li>
  );
}

function SocialLinks() {
  const hasAny = COMPANY.social.instagram || COMPANY.social.facebook;
  if (!hasAny) {
    return null;
  }
  return (
    <ul className="flex gap-3">
      <InstagramLink />
      <FacebookLink />
    </ul>
  );
}

function NavSeparator() {
  return <li className="text-white/30">·</li>;
}

function EmailLink() {
  const href = `mailto:${COMPANY.email.public}`;
  return (
    <a href={href} className="hover:text-white transition-colors">
      {COMPANY.email.public}
    </a>
  );
}

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-[var(--color-leaf-900)] text-white">
      {/* Seccion 1 - Zona principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {/* Brand + tagline + redes */}
          <div>
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
              <span className="font-serif text-xl">{COMPANY.brand}</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-5 max-w-sm">
              {COMPANY.tagline}. Una marca de {COMPANY.parentBrand}.
            </p>
            <SocialLinks />
          </div>

          {/* Newsletter */}
          <div className="md:max-w-md md:justify-self-end w-full">
            <h3 className="font-serif text-lg mb-1">
              Recibe novedades y ofertas
            </h3>
            <p className="text-xs text-white/65 leading-relaxed mb-3">
              Suscribete y recibe un cupon de bienvenida para tu primera
              compra. Sin spam, puedes cancelar cuando quieras.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Navegacion inline */}
        <nav className="mt-12 pt-8 border-t border-white/10">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
            <li>
              <Link
                href="/tienda"
                className="hover:text-white transition-colors"
              >
                Tienda
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/buscar"
                className="hover:text-white transition-colors"
              >
                Buscar productos
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/sobre-nosotros"
                className="hover:text-white transition-colors"
              >
                Sobre nosotros
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/preguntas-frecuentes"
                className="hover:text-white transition-colors"
              >
                Preguntas frecuentes
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/contacto"
                className="hover:text-white transition-colors"
              >
                Contacto
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/mi-cuenta"
                className="hover:text-white transition-colors"
              >
                Mi cuenta
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/legal/privacidad"
                className="hover:text-white transition-colors"
              >
                Politica de datos
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/legal/terminos"
                className="hover:text-white transition-colors"
              >
                Terminos
              </Link>
            </li>
            <NavSeparator />
            <li>
              <Link
                href="/legal/envios"
                className="hover:text-white transition-colors"
              >
                Envios
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Seccion 2 - Bottom legal compacta */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-white/55">
          <p>
            {"\u00A9"} {year} {COMPANY.legalName} {" \u00B7 "}
            {getFormattedAddress()} {" \u00B7 "}
            <EmailLink />
          </p>
          <p className="md:text-right">
            Pagos seguros con Bold {" \u00B7 "} Despachos a toda Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
