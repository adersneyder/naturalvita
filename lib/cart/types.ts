/**
 * Estructura de un item en el carrito.
 *
 * Snapshot del producto al momento de agregarlo: si después cambia el precio
 * en la BD, el carrito conserva el precio que el cliente vio. Decisión clásica
 * de UX e-commerce: nunca sorprender al cliente con cambios silenciosos.
 *
 * Cuando el cliente vaya a checkout (Hito 1.8) revalidaremos contra la BD y
 * mostraremos discrepancias antes del cobro.
 */
export type CartItem = {
  product_id: string;
  slug: string;
  name: string;
  presentation: string | null;
  price_cop: number;
  /** URL absoluta o relativa de la imagen primaria */
  image_url: string | null;
  quantity: number;
  /** Stock disponible en el momento de agregar, para mostrar tope */
  stock_at_add: number;
};

export type CartState = {
  items: CartItem[];
  /** Total acumulado, calculado al modificar */
  subtotal_cop: number;
  /** Cantidad total de unidades (suma de quantities) */
  total_quantity: number;
};

export const EMPTY_CART: CartState = {
  items: [],
  subtotal_cop: 0,
  total_quantity: 0,
};

/**
 * Recalcula totales después de modificar items.
 * Centralizado para garantizar coherencia entre subtotal y suma de items.
 */
export function recomputeTotals(items: CartItem[]): CartState {
  const subtotal_cop = items.reduce((acc, it) => acc + it.price_cop * it.quantity, 0);
  const total_quantity = items.reduce((acc, it) => acc + it.quantity, 0);
  return { items, subtotal_cop, total_quantity };
}
