import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="font-serif text-xl text-[var(--color-leaf-900)] mb-2">Producto no encontrado</h1>
      <p className="text-sm text-[var(--color-earth-700)] mb-4">
        El producto que buscas no existe o fue eliminado.
      </p>
      <Link
        href="/admin/productos"
        className="text-sm text-[var(--color-leaf-700)] underline"
      >
        Volver a productos
      </Link>
    </div>
  );
}
