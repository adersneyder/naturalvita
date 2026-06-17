import "server-only";
import type { TaskHandler } from "./index";

/**
 * Handler para tareas que NO ejecutan nada automáticamente. Sirven como
 * "señalización" — la aprobación marca la tarea como executed con un
 * resultado vacío, y el equipo realiza el siguiente paso manualmente.
 *
 * Usado por: manual, product.review, pricing.review, coupon.create.
 *
 * En el futuro, coupon.create podría tener su handler propio que crea
 * el cupón automáticamente al aprobar.
 */
export const handleManualNoop: TaskHandler = async () => {
  return { ok: true, result: { handled: "noop" } };
};
