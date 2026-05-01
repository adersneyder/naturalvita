"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  type CartItem,
  type CartState,
  EMPTY_CART,
  recomputeTotals,
} from "./types";

const STORAGE_KEY = "naturalvita.cart.v1";

/**
 * Lee el carrito de localStorage. Tolera datos corruptos:
 * si el JSON falla, devuelve carrito vacío en lugar de crashear.
 */
function loadFromStorage(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return EMPTY_CART;
    return recomputeTotals(parsed.items as CartItem[]);
  } catch {
    return EMPTY_CART;
  }
}

function saveToStorage(state: CartState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("naturalvita:cart-update"));
  } catch {
    // localStorage puede fallar (modo incógnito, cuota llena). Silencioso.
  }
}

/**
 * Estado externo cacheado en módulo. useSyncExternalStore lo usa para que
 * múltiples instancias del hook (icono del header + página de producto +
 * cart drawer) reflejen cambios al instante sin context provider.
 */
let cachedState: CartState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): CartState {
  if (cachedState === null) {
    cachedState = loadFromStorage();
  }
  return cachedState;
}

function getServerSnapshot(): CartState {
  return EMPTY_CART;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (listeners.size === 1) {
    // Primer listener: enganchamos los listeners globales
    const handler = () => {
      cachedState = loadFromStorage();
      listeners.forEach((cb) => cb());
    };
    window.addEventListener("naturalvita:cart-update", handler);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) handler();
    });
  }
  return () => {
    listeners.delete(callback);
  };
}

function mutate(updater: (state: CartState) => CartState): CartState {
  const current = getSnapshot();
  const next = updater(current);
  cachedState = next;
  saveToStorage(next);
  return next;
}

export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      mutate((current) => {
        const qty = item.quantity ?? 1;
        const existing = current.items.find((i) => i.product_id === item.product_id);
        let nextItems: CartItem[];
        if (existing) {
          const newQty = Math.min(existing.quantity + qty, existing.stock_at_add);
          nextItems = current.items.map((i) =>
            i.product_id === item.product_id ? { ...i, quantity: newQty } : i,
          );
        } else {
          nextItems = [
            ...current.items,
            {
              product_id: item.product_id,
              slug: item.slug,
              name: item.name,
              presentation: item.presentation,
              price_cop: item.price_cop,
              image_url: item.image_url,
              stock_at_add: item.stock_at_add,
              quantity: Math.min(qty, item.stock_at_add),
            },
          ];
        }
        return recomputeTotals(nextItems);
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    mutate((current) =>
      recomputeTotals(current.items.filter((i) => i.product_id !== productId)),
    );
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    mutate((current) => {
      if (quantity <= 0) {
        return recomputeTotals(current.items.filter((i) => i.product_id !== productId));
      }
      const nextItems = current.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity: Math.min(quantity, i.stock_at_add) }
          : i,
      );
      return recomputeTotals(nextItems);
    });
  }, []);

  const clear = useCallback(() => {
    mutate(() => EMPTY_CART);
  }, []);

  return {
    items: state.items,
    subtotal: state.subtotal_cop,
    quantity: state.total_quantity,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };
}

export function useCartCount(): number {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return state.total_quantity;
}
