"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

type ProductImage = {
  url: string;
  alt_text: string | null;
};

type Props = {
  images: ProductImage[];
  productName: string;
};

/**
 * Galería de producto con tres comportamientos:
 *
 *   1. Thumbnails clickeables a la izquierda (vertical en desktop ≥md,
 *      horizontal scroll en mobile). Click cambia la imagen principal.
 *   2. Imagen principal con hover-pan zoom en desktop: cursor-zoom-in,
 *      mover el mouse desplaza la vista al 200% manteniendo el punto bajo
 *      el cursor visible. En mobile, tap abre lightbox.
 *   3. Lightbox modal a pantalla completa con:
 *      - Navegación por flechas (UI + teclado)
 *      - Cerrar con Esc o click fuera
 *      - Swipe horizontal en mobile (touchstart/touchend)
 *      - Pinch zoom nativo del navegador via touch-action
 *
 * Sin librerías externas. ~300 LOC vs 30+KB de yet-another-image-gallery.
 */
export default function ProductGallery({ images, productName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);

  const active = images[activeIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  // Hover-pan zoom en desktop: traduce posición del mouse a transform-origin
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  }

  // Detectar si el dispositivo tiene puntero fino (mouse, no touch).
  // Solo en pointer-fine activamos hover-zoom; en touch abrimos lightbox al tap.
  const [hasFinePointer, setHasFinePointer] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    setHasFinePointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setHasFinePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleMainClick() {
    // En touch siempre abre lightbox. En desktop también, para vista grande.
    setLightboxOpen(true);
  }

  return (
    <>
      {/* GALERÍA INLINE */}
      <div className="md:grid md:grid-cols-[80px_1fr] md:gap-4">
        {/* Thumbnails */}
        {hasMultiple && (
          <div className="order-2 md:order-1 mt-3 md:mt-0">
            <ul
              className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0"
              role="list"
            >
              {images.map((img, idx) => (
                <li key={idx} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Ver imagen ${idx + 1} de ${images.length}`}
                    aria-current={activeIndex === idx ? "true" : "false"}
                    className={`block w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-[var(--color-earth-50)] border-2 transition-colors ${
                      activeIndex === idx
                        ? "border-[var(--color-iris-700)]"
                        : "border-transparent hover:border-[var(--color-earth-100)]"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text ?? `${productName} - imagen ${idx + 1}`}
                      width={160}
                      height={160}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Imagen principal */}
        <div className="order-1 md:order-2">
          <div
            ref={mainRef}
            onClick={handleMainClick}
            onMouseEnter={() => hasFinePointer && setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={hasFinePointer ? handleMouseMove : undefined}
            className="relative aspect-square bg-[var(--color-earth-50)] rounded-2xl overflow-hidden cursor-zoom-in group"
            role="button"
            aria-label="Ampliar imagen"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLightboxOpen(true);
              }
            }}
          >
            <Image
              src={active.url}
              alt={active.alt_text ?? productName}
              width={800}
              height={800}
              priority
              unoptimized
              className="w-full h-full object-contain transition-transform duration-150 ease-out"
              style={
                zoomActive && hasFinePointer
                  ? {
                      transform: "scale(2)",
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    }
                  : undefined
              }
            />

            {/* Indicador discreto de zoom */}
            {!zoomActive && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center text-[var(--color-leaf-900)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <ZoomIn size={16} strokeWidth={1.8} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          startIndex={activeIndex}
          productName={productName}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveIndex}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  startIndex,
  productName,
  onClose,
  onIndexChange,
}: {
  images: ProductImage[];
  startIndex: number;
  productName: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setIndex((i) => {
      const next = (i + 1) % images.length;
      onIndexChange(next);
      return next;
    });
  }, [images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    setIndex((i) => {
      const next = (i - 1 + images.length) % images.length;
      onIndexChange(next);
      return next;
    });
  }, [images.length, onIndexChange]);

  // Teclado: ← → para navegar, Esc para cerrar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);

    // Bloquear scroll del body mientras esté abierto
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goNext, goPrev]);

  // Swipe horizontal en touch
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }
  function handleTouchEnd() {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const delta = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (delta > threshold) goNext();
    else if (delta < -threshold) goPrev();
    touchStartX.current = null;
    touchEndX.current = null;
  }

  const current = images[index];
  const hasMultiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 animate-fade-in flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${productName}, imagen ${index + 1} de ${images.length}`}
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar galería"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
      >
        <X size={22} strokeWidth={1.8} />
      </button>

      {/* Contador */}
      {hasMultiple && (
        <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/80 text-sm tabular-nums z-10">
          {index + 1} / {images.length}
        </p>
      )}

      {/* Anterior */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Imagen anterior"
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white items-center justify-center transition-colors z-10"
        >
          <ChevronLeft size={28} strokeWidth={1.8} />
        </button>
      )}

      {/* Imagen */}
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center p-4 md:p-12 touch-pinch-zoom"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={current.url}
          alt={current.alt_text ?? productName}
          width={1600}
          height={1600}
          unoptimized
          className="max-w-full max-h-full w-auto h-auto object-contain select-none"
          draggable={false}
          priority
        />
      </div>

      {/* Siguiente */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Imagen siguiente"
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white items-center justify-center transition-colors z-10"
        >
          <ChevronRight size={28} strokeWidth={1.8} />
        </button>
      )}

      {/* Thumbnails inferiores en lightbox */}
      {hasMultiple && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIndex(idx);
                onIndexChange(idx);
              }}
              aria-label={`Ir a imagen ${idx + 1}`}
              className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                index === idx
                  ? "border-white"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={img.url}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-full h-full object-contain bg-white"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
