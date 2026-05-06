"use client";

type Props = {
  label: string;
  disabled?: boolean;
};

/**
 * Botón "Continuar con Google" / "Crear cuenta con Google" siguiendo
 * las guidelines visuales oficiales de Google Identity:
 *   - Fondo blanco con borde sutil.
 *   - Logo oficial multicolor a la izquierda.
 *   - Texto en mayúsculas/minúsculas naturales.
 *   - Hover sutil.
 */
export default function GoogleButton({ label, disabled = false }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-[var(--color-earth-200)] bg-white text-sm font-medium text-[var(--color-leaf-900)] hover:bg-[var(--color-earth-50)] hover:border-[var(--color-earth-300)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </button>
  );
}
