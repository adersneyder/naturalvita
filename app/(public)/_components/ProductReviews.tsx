"use client";

import { useActionState, useState } from "react";
import { submitReviewAction, type SubmitReviewState } from "../_actions/reviews";
import StarRating from "./StarRating";
import type { ProductReview, ReviewStats } from "@/lib/reviews/queries";

type Props = {
  productId: string;
  reviews: ProductReview[];
  stats: ReviewStats | null;
  /** Si el cliente puede dejar reseña (ya compró y le fue entregado) */
  canReview: boolean;
  /** orderId para asociar la reseña */
  eligibleOrderId: string | null;
  /** Si ya dejó reseña */
  alreadyReviewed: boolean;
};

const INITIAL_STATE: SubmitReviewState = { ok: false, message: "" };

/**
 * Bloque completo de reviews para la ficha de producto.
 * Incluye: resumen (stats), lista de reseñas, y formulario (si aplica).
 */
export default function ProductReviews({
  productId,
  reviews,
  stats,
  canReview,
  eligibleOrderId,
  alreadyReviewed,
}: Props) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewState, formAction, isPending] = useActionState(
    submitReviewAction,
    INITIAL_STATE,
  );

  return (
    <section aria-labelledby="reviews-heading" className="mt-12">
      <h2
        id="reviews-heading"
        className="font-serif text-2xl text-[var(--color-leaf-900)] mb-6"
      >
        Reseñas
      </h2>

      {/* Resumen de estrellas */}
      {stats && stats.review_count > 0 ? (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-5 rounded-2xl bg-[var(--color-earth-50)] border border-[var(--color-earth-100)]">
          <div className="flex flex-col items-center justify-center sm:border-r sm:border-[var(--color-earth-100)] sm:pr-6">
            <span className="font-serif text-5xl text-[var(--color-leaf-900)] tabular-nums">
              {stats.average_rating.toFixed(1)}
            </span>
            <StarRating
              rating={stats.average_rating}
              size={20}
              className="mt-1"
            />
            <span className="text-xs text-[var(--color-earth-500)] mt-1">
              {stats.review_count}{" "}
              {stats.review_count === 1 ? "reseña" : "reseñas"}
            </span>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[`count_${star}` as keyof ReviewStats] as number;
              const pct =
                stats.review_count > 0
                  ? Math.round((count / stats.review_count) * 100)
                  : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-right text-[var(--color-earth-700)]">
                    {star}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="#f59e0b"
                    aria-hidden="true"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  <div className="flex-1 h-2 bg-[var(--color-earth-100)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-[var(--color-earth-500)] tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[var(--color-earth-500)] text-sm mb-8">
          Este producto aún no tiene reseñas.{" "}
          {canReview ? "¡Sé el primero!" : ""}
        </p>
      )}

      {/* Formulario para dejar reseña */}
      {canReview && eligibleOrderId && !reviewState.ok && (
        <div className="mb-10 p-5 rounded-2xl border border-[var(--color-iris-700)]/20 bg-white">
          <h3 className="font-medium text-[var(--color-leaf-900)] mb-4">
            Deja tu reseña
          </h3>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="order_id" value={eligibleOrderId} />
            <input
              type="hidden"
              name="rating"
              value={selectedRating}
            />

            {/* Selector de estrellas */}
            <div>
              <p className="text-sm text-[var(--color-earth-700)] mb-2">
                Calificación <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                    className="transition-transform hover:scale-110"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <polygon
                        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                        fill={
                          star <= (hoverRating || selectedRating)
                            ? "#f59e0b"
                            : "#e5e7eb"
                        }
                        stroke={
                          star <= (hoverRating || selectedRating)
                            ? "#f59e0b"
                            : "#d1d5db"
                        }
                        strokeWidth="1"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="review-title"
                className="block text-sm text-[var(--color-earth-700)] mb-1"
              >
                Título (opcional)
              </label>
              <input
                id="review-title"
                type="text"
                name="title"
                maxLength={120}
                placeholder="Resumen breve de tu experiencia"
                disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="review-body"
                className="block text-sm text-[var(--color-earth-700)] mb-1"
              >
                Reseña (opcional)
              </label>
              <textarea
                id="review-body"
                name="body"
                rows={4}
                maxLength={2000}
                placeholder="Cuéntanos más sobre el producto, su efecto, presentación..."
                disabled={isPending}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-earth-200)] focus:outline-none focus:border-[var(--color-iris-700)] resize-none disabled:opacity-50"
              />
            </div>

            {reviewState.message && !reviewState.ok && (
              <p role="alert" className="text-sm text-red-600">
                {reviewState.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || selectedRating === 0}
              className="px-6 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Enviando..." : "Publicar reseña"}
            </button>
          </form>
        </div>
      )}

      {/* Confirmación después de enviar */}
      {reviewState.ok && (
        <div className="mb-8 p-4 rounded-xl bg-[var(--color-leaf-100)] text-[var(--color-leaf-900)] text-sm">
          ✓ {reviewState.message}
        </div>
      )}

      {/* Ya reseñaste */}
      {alreadyReviewed && (
        <p className="mb-8 text-sm text-[var(--color-earth-500)]">
          Ya dejaste una reseña para este producto.
        </p>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <ul className="space-y-6">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border-b border-[var(--color-earth-100)] pb-6 last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StarRating rating={review.rating} size={14} />
                  {review.title && (
                    <p className="font-medium text-[var(--color-leaf-900)] mt-1 text-sm">
                      {review.title}
                    </p>
                  )}
                </div>
                <span className="text-xs text-[var(--color-earth-400)] shrink-0 mt-1">
                  {new Date(review.created_at).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {review.body && (
                <p className="mt-2 text-sm text-[var(--color-earth-700)] leading-relaxed">
                  {review.body}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--color-earth-400)]">
                {review.customer_name ?? "Cliente verificado"}
              </p>
              {review.admin_reply && (
                <div className="mt-3 pl-3 border-l-2 border-[var(--color-iris-700)]/30">
                  <p className="text-xs text-[var(--color-iris-700)] font-medium mb-1">
                    Respuesta de NaturalVita
                  </p>
                  <p className="text-sm text-[var(--color-earth-700)]">
                    {review.admin_reply}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
