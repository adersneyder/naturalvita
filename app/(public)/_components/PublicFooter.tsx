import Link from "next/link";
import Image from "next/image";
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

function SocialLinks() {
  const hasAny = COMPANY.social.instagram || COMPANY.social.facebook;
  if (!hasAny) return null;
  return (
    <ul className="flex gap-3 mt-5">
      {COMPANY.social.instagram && (
        <li>
          <a
            href={COMPANY.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
        </li>
      )}
      {COMPANY.social.facebook && (
        <li>
          <a
            href={COMPANY.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
            aria-label="Facebook"
          >
            <FacebookIcon />
          </a>
        </li>
      )}
    </ul>
  );
}

/**
 * Columnas del footer.
 *
 * 4 columnas en desktop con título + lista de enlaces, alineadas verticalmente.
 * Estructura:
 *   - Catálogo: lo comercial
 *   - Empresa: quiénes somos
 *   - Ayuda: soporte al cliente
 *   - Legal: cumplimiento
 *
 * El newsletter y el bloque de marca van arriba, ancho completo / 2 col.
 */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Catálogo",
    links: [
      { label: "Tienda", href: "/tienda" },
      { label: "Buscar productos", href: "/buscar" },
      { label: "Mi cuenta", href: "/mi-cuenta" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre nosotros", href: "/sobre-nosotros" },
      { label: "Laboratorios", href: "/laboratorio" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Política de datos", href: "/legal/privacidad" },
      { label: "Términos", href: "/legal/terminos" },
      { label: "Envíos y devoluciones", href: "/legal/envios" },
    ],
  },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();
  const emailHref = `mailto:${COMPANY.email.public}`;

  return (
    <footer className="mt-16 bg-[var(--color-leaf-900)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        {/* Fila superior: brand + tagline + redes a la izquierda,
            newsletter a la derecha. */}
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 pb-10 border-b border-white/10">
          <div>
            {/* Logo de marca: misma imagen del header y de la metáfora
                raíz/flor en EverlifeOrigin. brightness/contrast invertidos
                vía CSS no aplican aquí — el footer es verde oscuro y el
                logo es transparente, así que se ve sobre cualquier fondo. */}
            <Link href="/" aria-label="NaturalVita · Inicio" className="inline-block mb-4">
              <Image
                src="/home/naturalvita-logo.webp"
                alt={COMPANY.brand}
                width={816}
                height={502}
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              {COMPANY.tagline}. Una marca de {COMPANY.parentBrand}.
            </p>
            <SocialLinks />
          </div>

          <div className="md:max-w-md md:justify-self-end w-full">
            <h3 className="font-serif text-lg mb-1.5">
              Recibe novedades y ofertas
            </h3>
            <p className="text-xs text-white/65 leading-relaxed mb-3">
              Suscríbete y recibe un cupón de bienvenida para tu primera
              compra. Sin spam, puedes cancelar cuando quieras.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Cuatro columnas estructuradas */}
        <nav
          aria-label="Pie de página"
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 pt-10"
        >
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-white/80">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom legal compacto */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-white/55">
          <p className="leading-relaxed">
            &copy; {year} {COMPANY.legalName} &middot;{" "}
            {getFormattedAddress()} &middot;{" "}
            <a href={emailHref} className="hover:text-white transition-colors">
              {COMPANY.email.public}
            </a>
          </p>
          <p className="md:text-right">
            Pagos seguros con Bold &middot; Despachos a toda Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}
