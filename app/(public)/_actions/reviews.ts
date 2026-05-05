"use server";

import { submitReview } from "@/lib/reviews/queries";
import { revalidatePath } from "next/cache";

export type SubmitReviewState = {
  ok: boolean;
  message: string;
};

/**
 * Server action para enviar una reseña de producto.
 * Valida elegibilidad server-side antes de insertar.
 */
export async function submitReviewAction(
  _prev: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  const productId = formData.get("product_id")?.toString() ?? "";
  const orderId = formData.get("order_id")?.toString() ?? "";
  const rating = parseInt(formData.get("rating")?.toString() ?? "0", 10);
  const title = formData.get("title")?.toString() ?? "";
  const body = formData.get("body")?.toString() ?? "";

  if (!productId || !orderId) {
    return { ok: false, message: "Datos incompletos" };
  }
  if (!rating || rating < 1 || rating > 5) {
    return { ok: false, message: "Selecciona una calificación entre 1 y 5" };
  }

  const result = await submitReview({ productId, orderId, rating, title, body });

  if (result.ok) {
    revalidatePath(`/producto/[slug]`, "page");
    revalidatePath("/mi-cuenta");
  }

  return {
    ok: result.ok,
    message: result.ok
      ? "¡Gracias por tu reseña! Ya aparece en el producto."
      : (result.error ?? "No pudimos guardar tu reseña"),
  };
}
