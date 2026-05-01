"use client";

import { useToasts } from "@/lib/cart/use-toasts";

export default function Toaster() {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-2rem))]"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const variantClass =
          toast.variant === "success"
            ? "border-[var(--color-leaf-500)]/30 bg-[var(--color-leaf-50)]"
            : toast.variant === "error"
              ? "border-red-300 bg-red-50"
              : "border-[var(--color-earth-100)] bg-white";
        const accentDot =
          toast.variant === "success"
            ? "bg-[var(--color-leaf-500)]"
            : toast.variant === "error"
              ? "bg-red-500"
              : "bg-[var(--color-iris-500)]";

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-xl border ${variantClass} shadow-md p-3 animate-fade-in`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 w-2 h-2 rounded-full ${accentDot} shrink-0`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-leaf-900)] m-0">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-[var(--color-earth-700)] m-0 mt-0.5">
                    {toast.description}
                  </p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="text-xs font-medium text-[var(--color-iris-700)] hover:text-[var(--color-iris-900)] mt-1.5 underline-offset-2 hover:underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-[var(--color-earth-500)] hover:text-[var(--color-earth-900)] -mr-1 -mt-1 p-1 rounded"
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
