"use client";

import { useCallback, useSyncExternalStore } from "react";

let drawerOpen = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): boolean {
  return drawerOpen;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useCartDrawer() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const open = useCallback(() => {
    drawerOpen = true;
    notify();
  }, []);

  const close = useCallback(() => {
    drawerOpen = false;
    notify();
  }, []);

  return { isOpen, open, close };
}

/** Función imperativa para abrir desde fuera de React */
export function openCartDrawer(): void {
  drawerOpen = true;
  listeners.forEach((cb) => cb());
}
