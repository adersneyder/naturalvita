/**
 * Formato de precios para Colombia.
 *
 * Usamos `Intl.NumberFormat` con locale es-CO. Resultado:
 *   45000  -> "$45.000"
 *   125900 -> "$125.900"
 *
 * Sin decimales (los pesos colombianos no se manejan con centavos en retail),
 * con punto como separador de miles (estándar local).
 */

const FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCop(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return FORMATTER.format(amount);
}

/**
 * Calcula el descuento porcentual entre precio comparado y precio actual.
 * Devuelve null si no hay descuento o si los datos no aplican.
 */
export function calculateDiscount(
  current: number,
  compareAt: number | null | undefined,
): number | null {
  if (!compareAt || compareAt <= current) return null;
  return Math.round(((compareAt - current) / compareAt) * 100);
}
