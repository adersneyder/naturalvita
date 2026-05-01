"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  /** Acción opcional con label + handler */
  action?: { label: string; onClick: () => void };
  /** Duración en ms antes de auto-cerrar. Default 3500. */
  duration?: number;
  variant: "success" | "info" | "error";
};

let toasts: Toast[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Toast[] {
  return toasts;
}

function getServerSnapshot(): Toast[] {
  return [];
}

export function useToasts() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts: list, dismiss };
}

/**
 * Función imperativa para disparar un toast desde cualquier parte del código,
 * incluso fuera de componentes React. Patrón Sonner-like.
 */
export function showToast(input: Omit<Toast, "id"> & { id?: string }): string {
  const id = input.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const toast: Toast = {
    id,
    title: input.title,
    description: input.description,
    action: input.action,
    duration: input.duration ?? 3500,
    variant: input.variant ?? "info",
  };
  toasts = [...toasts, toast];
  notify();

  const duration = toast.duration ?? 3500;
  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }

  return id;
}
