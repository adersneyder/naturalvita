import Link from "next/link";
import StarRating from "../_components/StarRating";

type Review = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

type Props = {
  reviews: Review[];
};

export default function CustomerReviewsPanel({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 mx-auto mb-4 text-[var(--color-earth-200)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <p className="text-[var(--color-earth-700)] font-medium mb-2">
          No has dejado reseñas todavía
        </p>
        <p className="text-sm text-[var(--color-earth-500)] mb-6">
          Puedes reseñar productos de pedidos que ya fueron entregados.
        </p>
        <Link
          href="/mi-cuenta?tab=pedidos"
          className="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors"
        >
          Ver mis pedidos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--color-earth-500)] mb-5">
        {reviews.length} {reviews.length === 1 ? "reseña publicada" : "reseñas publicadas"}
      </p>
      <ul className="space-y-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="p-4 rounded-xl border border-[var(--color-earth-100)] bg-[var(--color-earth-50)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/producto/${review.product_slug}`}
                  className="text-sm font-medium text-[var(--color-iris-700)] hover:underline line-clamp-1"
                >
                  {review.product_name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={review.rating} size={13} />
                  {review.title && (
                    <span className="text-sm font-medium text-[var(--color-leaf-900)]">
                      {review.title}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-[var(--color-earth-400)] shrink-0 mt-0.5">
                {new Date(review.created_at).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {review.body && (
              <p className="mt-2 text-sm text-[var(--color-earth-700)] leading-relaxed line-clamp-3">
                {review.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
