export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-[var(--color-leaf-100)] text-[var(--color-leaf-700)] text-sm font-medium">
          Próximamente
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold text-[var(--color-leaf-900)] mb-6 tracking-tight">
          NaturalVita
        </h1>

        <p className="text-lg md:text-xl text-[var(--color-earth-700)] mb-10 leading-relaxed">
          Productos naturales seleccionados para tu bienestar.
          <br />
          Estamos preparando algo especial para ti.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-earth-500)]">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-leaf-500)] animate-pulse"></span>
          Sitio en construcción
        </div>
      </div>
    </main>
  );
}
