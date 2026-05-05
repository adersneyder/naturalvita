import Link from "next/link";
import Image from "next/image";
import type { WishlistItem } from "@/lib/wishlist/queries";
import { formatCop } from "@/lib/format/currency";
import WishlistButton from "../_components/WishlistButton";

type Props = {
  items: WishlistItem[];
};

export default function WishlistPanel({ items }: Props) {
  if (items.length === 0) {
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
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
        <p className="text-[var(--color-earth-700)] font-medium mb-2">
          No tienes favoritos guardados
        </p>
        <p className="text-sm text-[var(--color-earth-500)] mb-6">
          Toca el corazón en cualquier producto para guardarlo aquí.
        </p>
        <Link
          href="/tienda"
          className="inline-block px-5 py-2.5 rounded-lg bg-[var(--color-iris-700)] text-white text-sm font-medium hover:bg-[var(--color-iris-600)] transition-colors"
        >
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--color-earth-500)] mb-5">
        {items.length} {items.length === 1 ? "producto guardado" : "productos guardados"}
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <li key={item.id} className="group">
            <div className="relative rounded-xl overflow-hidden bg-[var(--color-earth-50)] border border-[var(--color-earth-100)] hover:border-[var(--color-earth-200)] transition-colors">
              {/* Imagen */}
              <Link href={`/producto/${item.product.slug}`}>
                <div className="relative aspect-square bg-white">
                  {item.product.image_url ? (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--color-earth-300)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              {/* Botón quitar wishlist */}
              <div className="absolute top-2 right-2">
                <WishlistButton
                  productId={item.product_id}
                  initialInWishlist={true}
                  size={18}
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <Link href={`/producto/${item.product.slug}`}>
                  <p className="text-xs font-medium text-[var(--color-leaf-900)] line-clamp-2 hover:text-[var(--color-iris-700)] transition-colors">
                    {item.product.name}
                  </p>
                </Link>
                <p className="text-sm font-semibold text-[var(--color-leaf-900)] mt-1 tabular-nums">
                  {formatCop(item.product.price_cop)}
                </p>
                {item.product.status !== "active" && (
                  <p className="text-xs text-[var(--color-earth-400)] mt-1">
                    No disponible
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
